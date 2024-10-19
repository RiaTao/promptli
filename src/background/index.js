import ollama, { Ollama } from "ollama/browser";

let abortController = new AbortController();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchWithSignal = (...args) => {
  return fetch(args[0], {
    ...args[1],
    signal: abortController.signal,
  });
};

const generate = (args) => {
  const ollama = new Ollama({
    fetch: fetchWithSignal,
  });
  return ollama.generate(args).catch((e) => {
    console.warn(e);
    const message = e?.message;
    if (message === "unexpected server status: llm server loading model") {
      return sleep(3000).then(() => {
        if (abortController.signal.aborted) {
          throw new Error("Aborted");
        }
        return generate(args);
      });
    }
    throw e;
  });
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "ollama.list") {
    ollama
      .list()
      .then((result) => sendResponse(result))
      .catch(() => sendResponse(null));
    return true;
  }
  if (request.type === "ollama.generate") {
    abortController.abort();
    abortController = new AbortController();
    generate(request.data)
      .then((result) => sendResponse(result))
      .catch(() => sendResponse(null));

    return true;
  }
});