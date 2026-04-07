import React, { useEffect, useState } from 'react';
const { ipcRenderer } = window.require('electron');

export default function Settings() {
  const [balances, setBalances] = useState({ deepgram: null, groq: null });

  useEffect(() => {
    async function fetchBalances() {
      const res = await ipcRenderer.invoke('get-balances');
      setBalances(res);
    }
    fetchBalances();
  }, []);

  return (
    <div className="container">
      <div className="header">
        <img src="../../assets/icon.png" className="logo" alt="VocalFlow" />
        <h1>VocalFlow</h1>
      </div>
      
      <div className="card">
        <h3>System Status</h3>
        <div className="row">
          <span className="label">Hotkey</span>
          <span className="value">Hold Right Alt</span>
        </div>
        <div className="row">
          <span className="label">Status</span>
          <span className="value" style={{color: '#4ade80'}}>Ready to Dictate</span>
        </div>
        <p className="info-note">Press and hold Right Alt to transcribe into any text field.</p>
      </div>

      <div className="card">
        <h3>Usage & Balances</h3>
        <div className="row">
          <span className="label">Deepgram Balance</span>
          <span className="value">
            {balances.deepgram !== null ? `$${balances.deepgram}` : 'Loading...'}
          </span>
        </div>
        <div className="row">
          <span className="label">Groq Balance</span>
          <span className="value">
            {balances.groq && balances.groq.includes('$') ? balances.groq : 'Console View Only'}
          </span>
        </div>
        <p className="info-note">
          Note: Groq does not provide a public balance API. View usage directly in the 
          <a href="https://console.groq.com/" target="_blank" style={{color: '#a78bfa', marginLeft: '5px'}}>Groq Console</a>.
        </p>
      </div>

      <div className="footer">
        VocalFlow for Windows v1.0.0
      </div>
    </div>
  );
}
