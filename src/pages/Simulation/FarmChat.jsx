import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { sendChat } from './api.js';
import './FarmChat.css';

function Icon({ name, ...props }) {
  const paths = {
    chat: <><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H5l-4 3V11.5a8.5 8.5 0 0 1 8.5-8.5h3a8.5 8.5 0 0 1 8.5 8.5Z" /><path d="M7 10h8M7 14h5" /></>,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    send: <><path d="m12 19 0-14m-6 6 6-6 6 6" /></>,
    leaf: <><path d="M20 4c-9-1-16 2-16 9a7 7 0 0 0 7 7c7 0 10-7 9-16Z" /><path d="m5 19 9-9M10 14v-4m0 4h4" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}

const suggestions = [
  ['Estado de la cosecha', '¿Cómo va la cosecha? Consulta el estado actual de la flota.'],
  ['Rendimiento de la flota', '¿Hay máquinas esperando o cuellos de botella en la flota?'],
  ['Ideas para mejorar', '¿Qué mejoras recomiendas para esta cosecha? Solo recomienda, sin hacer cambios.'],
];

export default function FarmChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [unread, setUnread] = useState(false);
  const conversation = useRef(null);
  const controller = useRef(null);
  const input = useRef(null);
  const launcher = useRef(null);
  const end = useRef(null);
  const isOpen = useRef(open);
  useEffect(() => { isOpen.current = open; }, [open]);

  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (open) {
      input.current?.focus();
    }
  }, [open]);
  useEffect(() => {
    if (open) end.current?.scrollIntoView({ block: 'nearest' });
  }, [messages, pending, error, open]);

  function close() {
    setOpen(false);
    launcher.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    const onEscape = event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        launcher.current?.focus();
      }
    };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [open]);

  async function submit(text = draft) {
    const message = text.trim();
    if (!message || controller.current || message.length > 4000) return;
    conversation.current ??= crypto.randomUUID();
    const abort = new AbortController();
    controller.current = abort;
    setMessages(previous => [...previous, { role: 'user', text: message }]);
    setDraft('');
    setError('');
    setPending(true);
    // No automatic retries: the agent may already have acted on the simulation.
    const timeout = setTimeout(() => abort.abort('timeout'), 145000);
    try {
      const replyId = crypto.randomUUID();
      await sendChat(message, conversation.current, abort.signal, text => {
        setMessages(previous => previous.some(item => item.id === replyId)
          ? previous.map(item => item.id === replyId ? { ...item, text } : item)
          : [...previous, { id: replyId, role: 'assistant', text }]);
      });
      if (!isOpen.current) setUnread(true);
    } catch (failure) {
      if (abort.signal.aborted && abort.signal.reason !== 'timeout') return;
      setError(abort.signal.aborted
        ? 'La respuesta tardó demasiado. Revisa la simulación antes de repetir una acción.'
        : failure instanceof TypeError
          ? 'No se pudo conectar. Comprueba tu conexión y el servidor de simulación. Si pediste una acción, revisa su estado antes de repetirla.'
          : failure.message);
      if (!isOpen.current) setUnread(true);
    } finally {
      clearTimeout(timeout);
      controller.current = null;
      setPending(false);
    }
  }

  // Unity installs global keyboard handlers after loading its WebGL build.
  // Register first, at window capture, and keep textarea default editing intact.
  const onChatKeyboard = useEffectEvent(event => {
    if (event.target !== input.current) return;
    event.stopImmediatePropagation();
    if (event.type !== 'keydown' || event.isComposing) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  });
  useEffect(() => {
    const handle = event => onChatKeyboard(event);
    const types = ['keydown', 'keypress', 'keyup'];
    types.forEach(type => window.addEventListener(type, handle, true));
    return () => types.forEach(type => window.removeEventListener(type, handle, true));
  }, []);

  return (
    <div className="farm-chat">
      {open && <section id="farm-chat-panel" className="farm-chat-panel" role="dialog" aria-label="Asistente de campo OpenClaw">
        <header className="farm-chat-header">
          <span className="farm-chat-avatar"><Icon name="leaf" /></span>
          <div className="farm-chat-heading"><h2>Asistente de campo</h2><p>OpenClaw <span aria-hidden="true">·</span> Farm Manager</p></div>
          <button type="button" className="farm-chat-icon-button" aria-label="Nueva conversación" title="Nueva conversación" disabled={pending || !messages.length} onClick={() => {
            setMessages([]); setError(''); conversation.current = null; input.current?.focus();
          }}><Icon name="plus" /></button>
          <button type="button" className="farm-chat-icon-button" aria-label="Cerrar asistente" title="Cerrar (Esc)" onClick={close}><Icon name="close" /></button>
        </header>
        <div className="farm-chat-context"><span /> Tu copiloto para la simulación</div>
        <div className="farm-chat-body">
          {!messages.length && <div className="farm-chat-welcome">
            <div className="farm-chat-welcome-icon"><Icon name="leaf" /></div>
            <span className="farm-chat-eyebrow">CADA DECISIÓN CUENTA</span>
            <h3>Una mejor cosecha<br />empieza con una pregunta.</h3>
            <p>Consulta tu flota, entiende lo que pasa en el campo y descubre cómo mejorar la operación.</p>
            <div className="farm-chat-suggestions">{suggestions.map(([label, question]) => <button type="button" key={label} onClick={() => submit(question)}>{label}<span aria-hidden="true">↗</span></button>)}</div>
          </div>}
          <div role="log" aria-label="Conversación" aria-live="polite" aria-relevant="additions" className="farm-chat-messages">
            {messages.map((message, index) => <div className={`farm-chat-message farm-chat-message-${message.role}`} key={index}>
              <span className="farm-chat-speaker">{message.role === 'user' ? 'Tú' : 'Asistente de campo'}</span>
              <div className="farm-chat-bubble">{message.text}</div>
            </div>)}
          </div>
          {pending && <div className="farm-chat-pending" role="status"><span className="farm-chat-dots" aria-hidden="true"><i /><i /><i /></span> OpenClaw está trabajando…</div>}
          {error && <div className="farm-chat-error" role="alert">{error}</div>}
          <div ref={end} />
        </div>
        <form className="farm-chat-composer" onSubmit={event => { event.preventDefault(); submit(); }}>
          <label className="farm-chat-sr-only" htmlFor="farm-chat-input">Mensaje para el asistente</label>
          <div className="farm-chat-input-wrap">
            <textarea ref={input} id="farm-chat-input" value={draft} onChange={event => setDraft(event.target.value)} placeholder="¿Cómo va mi cosecha?" rows={2} maxLength={4000} />
            <button className="farm-chat-send" type="submit" aria-label="Enviar mensaje" disabled={pending || !draft.trim()}><Icon name="send" /></button>
          </div>
          <div className="farm-chat-input-hint"><span>Enter para enviar · Shift + Enter para nueva línea</span>{draft.length > 3500 && <span>{draft.length}/4000</span>}</div>
          <p className="farm-chat-disclaimer">Tus instrucciones pueden modificar la simulación.</p>
        </form>
      </section>}
      <button ref={launcher} type="button" className={`farm-chat-launcher${open ? ' is-open' : ''}`} aria-label={open ? 'Cerrar asistente de campo' : 'Abrir asistente de campo'} aria-expanded={open} aria-controls="farm-chat-panel" onClick={() => { if (open) close(); else { setUnread(false); setOpen(true); } }}>
        <Icon name={open ? 'close' : 'chat'} /><span>{open ? 'Cerrar' : 'Asistente de campo'}</span>{unread && <span className="farm-chat-unread" aria-label="Nueva respuesta" />}
      </button>
    </div>
  );
}
