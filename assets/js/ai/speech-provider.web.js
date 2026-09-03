/* =========================================================================
   FlowArena — SpeechProvider: web-speech-api (Modul 3)
   -------------------------------------------------------------------------
   Implementiert Speech-to-Text komplett clientseitig über die Web Speech
   API (SpeechRecognition/webkitSpeechRecognition). Kein Backend, keine
   Kosten, aber: nur verfügbar in Chromium-Browsern, braucht Internet (der
   Browser schickt die Audiodaten an den Spracherkennungsdienst des
   Herstellers) und funktioniert nicht von file:// aus.

   Austausch-Kandidat für später: ein `speech-provider.whisper.js`, der
   stattdessen den aufgenommenen Audio-Blob an einen Backend-Endpoint
   schickt (z.B. Whisper-API), für bessere Genauigkeit/Offline-Fähigkeit.
   Muss nur dasselbe Interface (isSupported/start/stop/getTranscript)
   erfüllen und am Ende `window.FlowAI.speech` überschreiben.
   ========================================================================= */

(function (window) {
  "use strict";

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  let recognition = null;
  let shouldRun = false;
  let finalTranscript = "";

  function start() {
    if (!SR) return;
    finalTranscript = "";
    try {
      recognition = new SR();
      recognition.lang = "de-DE";
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + " ";
          }
        }
      };
      recognition.onerror = () => {
        /* Stille Degradierung — Aufnahme/Challenge läuft trotzdem weiter */
      };
      recognition.onend = () => {
        // Manche Browser beenden 'continuous' Sessions nach Stille von
        // selbst — solange die Challenge noch läuft, neu starten.
        if (shouldRun) {
          try { recognition.start(); } catch (e) { /* bereits aktiv */ }
        }
      };

      shouldRun = true;
      recognition.start();
    } catch (e) {
      recognition = null;
    }
  }

  function stop() {
    shouldRun = false;
    try { recognition?.stop(); } catch (e) {}
  }

  const WebSpeechProvider = {
    isSupported: !!SR,
    start,
    stop,
    getTranscript() {
      return finalTranscript.trim();
    },
  };

  window.FlowAI = window.FlowAI || {};
  window.FlowAI.speech = WebSpeechProvider;
})(window);
