exports.throttle = function(func, delay, tail) {
  let lastCalled = Date.now();
  let timer;
  // if (tail) {

  // }
  return (...args) => {
    const now = Date.now();
    if (now - lastCalled > delay) {
      func(...args);
      lastCalled = now;
    }
    if (tail) {
      clearTimeout(timer);
      timer = setTimeout(func, delay / 2, ...args);
    }
  };
};

exports.showTip = function(message, delay = 3000) {
  const div = document.createElement("div");
  div.classList.add("tip");
  div.innerHTML = String(message);
  document.body.appendChild(div);
  setTimeout(() => div.classList.add("showed"), 50);
  setTimeout(() => {
    div.classList.remove("showed");
    setTimeout(() => document.body.removeChild(div), 500);
  }, delay);
};
