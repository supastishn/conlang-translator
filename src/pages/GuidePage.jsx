import React from 'react';
import { useParams } from 'react-router-dom';

export default function GuidePage() {
  const { guideType } = useParams();
  
  return (
    <div className="settings-container">
      <h2>
        {guideType === 'openrouter'
          ? 'OpenRouter Guide'
          : guideType === 'google-aistudio-gemini'
          ? 'Google AI Studio Gemini Guide'
          : 'Guide'}
      </h2>
      <p>Guide content will appear here</p>
      {/* For now - redirect to HTML files */}
      <iframe
        src={`/${guideType}.html`}
        title={`${guideType} guide`}
        style={{ width: '100%', height: '80vh', border: 'none' }}
      />
    </div>
  );
}
