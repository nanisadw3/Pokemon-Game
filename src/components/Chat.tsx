import React from 'react';

interface ChatMessage {
  sender: 'player1' | 'player2' | 'system';
  text: string;
}

interface ChatProps {
  chatVisible: boolean;
  setChatVisible: (visible: boolean) => void;
  isChatMinimized: boolean;
  setIsChatMinimized: (minimized: boolean) => void;
  chatInput: string;
  setChatInput: (input: string) => void;
  messages: ChatMessage[];
  myPlayerNum: 1 | 2 | null;
  handleSendMessage: (e?: React.FormEvent) => void;
  chatMessagesRef: React.RefObject<HTMLDivElement>;
}

const Chat: React.FC<ChatProps> = ({
  chatVisible,
  setChatVisible,
  isChatMinimized,
  setIsChatMinimized,
  chatInput,
  setChatInput,
  messages,
  myPlayerNum,
  handleSendMessage,
  chatMessagesRef
}) => {
  if (!chatVisible) {
    return <button className="toggle-chat-btn" onClick={() => setChatVisible(true)}>💬 Chat</button>;
  }

  return (
    <div className={`chat-container ${isChatMinimized ? 'minimized' : ''}`}>
      <div className="chat-header" onClick={() => setIsChatMinimized(!isChatMinimized)}>
        <span>{isChatMinimized ? '💬 Chat' : '💬 Chat Multijugador'}</span>
        {!isChatMinimized && (
          <button 
            onClick={(e) => { e.stopPropagation(); setChatVisible(false); }} 
            style={{background:'none', border:'none', color:'#1e293b', cursor:'pointer', fontSize:'1.2rem', fontWeight:'bold'}}
          >
            ×
          </button>
        )}
      </div>
      {!isChatMinimized && (
        <>
          <div className="chat-messages" ref={chatMessagesRef}>
            {messages.length === 0 && <p className="message system">¡Suerte!</p>}
            {messages.map((m, i) => {
              const isMe = (myPlayerNum === 1 && m.sender === 'player1') || (myPlayerNum === 2 && m.sender === 'player2');
              return (
                <div key={i} className={`message ${m.sender}`}>
                  {m.sender !== 'system' && <strong>{isMe ? 'Tú: ' : 'Él: '}</strong>}
                  {m.text}
                </div>
              );
            })}
          </div>
          <form className="chat-input-area" onSubmit={handleSendMessage}>
            <input 
              type="text" 
              placeholder="Escribe..." 
              value={chatInput} 
              onChange={(e) => setChatInput(e.target.value)} 
            />
            <button type="submit">OK</button>
          </form>
        </>
      )}
    </div>
  );
};

export default Chat;
