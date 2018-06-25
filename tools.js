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
