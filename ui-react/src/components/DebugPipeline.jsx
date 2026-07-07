import React, { useEffect, useState, useRef } from 'react';
import { X, CheckCircle, Circle, PlayCircle, XCircle } from 'lucide-react';
import './DebugPipeline.css';

const PIPELINE_NODES = [
  { id: 'user', title: 'User Question', icon: '👤' },
  { id: 'api', title: 'FastAPI Server', icon: '⚙️' },
  { id: 'hybrid', title: 'Hybrid Retrieval', icon: '🔍' },
  { id: 'dense', title: 'Dense Search', icon: '🔢' },
  { id: 'bm25', title: 'BM25 Search', icon: '🔤' },
  { id: 'merge', title: 'Merge Results', icon: '🔗' },
  { id: 'reranker', title: 'Cross Encoder', icon: '⚖️' },
  { id: 'topdocs', title: 'Top Documents', icon: '📄' },
  { id: 'context', title: 'Context Builder', icon: '📝' },
  { id: 'gemma', title: 'Gemma (Ollama)', icon: '🧠' },
  { id: 'streaming', title: 'Streaming Response', icon: '🌊' },
  { id: 'ui', title: 'React UI', icon: '⚛️' }
];

const Connector = ({ status }) => (
  <div className="dag-node-container">
    <svg className={`svg-connector ${status}`}>
      <line x1="10" y1="0" x2="10" y2="40" />
    </svg>
  </div>
);

const Node = ({ node, nodeState }) => {
  const status = nodeState?.status || 'idle';
  const duration = nodeState?.duration;
  const details = nodeState?.details;
  const error = nodeState?.error;

  return (
    <div className={`dag-node-container`}>
      <div className={`dag-node ${status}`}>
        <div className="node-header">
          <span className="node-icon">{node.icon}</span>
          <span>{node.title}</span>
          <span style={{ marginLeft: 'auto' }}>
            {status === 'success' && <CheckCircle size={16} />}
            {status === 'running' && <PlayCircle size={16} />}
            {status === 'idle' && <Circle size={16} />}
            {status === 'failed' && <XCircle size={16} />}
          </span>
        </div>
        <div className="node-status">
          {status === 'idle' && 'Pending'}
          {status === 'running' && 'Running...'}
          {status === 'success' && 'Completed'}
          {status === 'failed' && 'Failed'}
        </div>
        {details && (
          <div className="node-details">
            {Object.entries(details).map(([k, v]) => (
              <span key={k}>{k}: {v}</span>
            ))}
          </div>
        )}
        {error && (
          <div className="node-details" style={{color: '#fca5a5', background: 'rgba(239, 68, 68, 0.2)'}}>
            <span>Error: {error}</span>
          </div>
        )}
      </div>
      {duration !== undefined && <div className="node-time">{duration}ms</div>}
    </div>
  );
};

export default function DebugPipeline({ isOpen, onClose }) {
  const [nodeStates, setNodeStates] = useState({});
  const [logs, setLogs] = useState([]);
  const logsEndRef = useRef(null);

  useEffect(() => {
    const es = new EventSource('/debug/events');
    
    es.onmessage = (e) => {
      // Ignore keep-alives
      if (!e.data || e.data.trim() === '') return;
      
      try {
        const data = JSON.parse(e.data);
        const { stage, status, time, duration, details, error } = data;
        
        setNodeStates(prev => {
          if (stage === 'User Question' && status === 'running') {
            return { [stage]: { status, duration, details, error } };
          }
          return {
            ...prev,
            [stage]: { status, duration, details, error }
          };
        });
        
        setLogs(prev => {
          if (stage === 'User Question' && status === 'running') {
            return [{ msg: `⚙ ${stage} started...`, type: 'running', time: new Date(time * 1000).toLocaleTimeString() }];
          }
          
          const logType = status === 'success' ? 'success' : status === 'failed' ? 'failed' : 'running';
          const logMsg = status === 'failed' ? `❌ ${stage} failed: ${error}` :
                         status === 'success' ? `✔ ${stage} completed` :
                         `⚙ ${stage} started...`;
                         
          return [...prev, { msg: logMsg, type: logType, time: new Date(time * 1000).toLocaleTimeString() }];
        });
        
      } catch (err) {
        console.error("Error parsing debug event", err);
      }
    };
    
    return () => {
      es.close();
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isOpen]);

  return (
    <div className={`debug-overlay ${isOpen ? 'open' : ''}`}>
      <button className="debug-close" onClick={onClose}><X size={20} /></button>
      
      <div className="debug-content">
        <div className="debug-dag">
          {PIPELINE_NODES.map((node, i) => {
            const state = nodeStates[node.title];
            const status = state?.status || 'idle';
            return (
              <React.Fragment key={node.id}>
                <Node node={node} nodeState={state} />
                {i < PIPELINE_NODES.length - 1 && (
                  <Connector status={status} />
                )}
              </React.Fragment>
            );
          })}
        </div>
        
        <div className="debug-log-panel">
          <div className="log-panel-header">Real-time Execution Console</div>
          {logs.map((log, i) => (
            <div key={i} className={`log-entry ${log.type}`}>
              <span style={{ color: '#6b7280' }}>[{log.time}]</span>
              <span>{log.msg}</span>
            </div>
          ))}
          {logs.length === 0 && <div style={{color: '#6b7280'}}>Waiting for execution...</div>}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
}
