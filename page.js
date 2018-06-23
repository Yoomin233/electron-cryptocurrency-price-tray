const { ipcRenderer } = require("electron");
// const pako = require("pako");
const fs = require("fs");
// fs.readdir("./assets", (err, files) => console.log(files));
// ipcRenderer.send('heheE', '3333')

// const wsAddr = "wss://api.huobi.pro/ws";

// function subscribe(ws) {
//   const symbols = ["bchusdt"];
//   // 订阅深度
//   // 谨慎选择合并的深度，ws每次推送全量的深度数据，若未能及时处理容易引起消息堆积并且引发行情延时
//   for (let symbol of symbols) {
//     ws.send(
//       JSON.stringify({
//         sub: `market.${symbol}.depth.step0`,
//         id: `${symbol}`
//       })
//     );
//   }
// }

// function init() {
//   const ws = new WebSocket(wsAddr);
//   ws.addEventListener("open", () => {
//     console.log("ws opened!");
//     subscribe(ws);
//   });
//   ws.addEventListener("message", data => {
//     const text = pako.deflate(data, {
//       to: "string"
//     });
//     const msg = JSON.parse(text);
//     if (msg.ping) {
//       console.log("ping received!");
//       ws.send(
//         JSON.stringify({
//           pong: msg.ping
//         })
//       );
//     } else if (msg.tick) {
//       console.log(msg);
//     } else {
//       console.log(msg);
//     }
//   });
//   ws.addEventListener("close", () => {
//     console.log("close");
//     setTimeout(init, 1000);
//   });
//   ws.addEventListener("error", err => {
//     console.log("error", err);
//     setTimeout(init, 1000);
//   });
// }
// init();
(function() {
  let symbols = ["btc"];

  const mainWrapper = document.querySelector(".scrollable");
  const outerWrapper = document.querySelector("div.mainWrapper");
  const themeCheckBox = document.querySelector("input#themeChanger");
  const themeSwitch = document.querySelector(".themeWrapper > span");
  const lastFetchedTime = document.querySelector(
    ".infoAndThettings > span:first-of-type > span"
  );
  const lastFetchImg = document.querySelector(
    ".infoAndThettings > span:first-of-type > img"
  );
  const addSymbolButton = document.querySelector("div.add");
  const adder = document.querySelector("div.symbolAdder");
  const addInput = document.querySelector("input.addInput");

  const ifDarkend = localStorage.getItem("themeDarken");
  if (ifDarkend) {
    outerWrapper.classList.add("darken");
    themeCheckBox.checked = true;
  }
  // if is fetching data...
  let fetching = false;

  function fetchLatestPrice() {
    let promiseArr = [];
    for (let i of symbols) {
      promiseArr.push(
        fetch(`https://data.gateio.io/api2/1/ticker/${i}_usdt`).then(data =>
          data.json()
        )
      );
    }
    // return new Promise((resolve, reject))
    return Promise.all(promiseArr).then(data => {
      // console.log(data);
      lastFetchedTime.innerHTML = Date.now();
      renderToPage(data);
      return data;
    });
    // console.log(resps);
  }

  // mainWrapper.

  function renderToPage(dataArr) {
    for (let [index, val] of dataArr.entries()) {
      const thisSymbol = symbols[index];
      let thisSymbolWrapper = document.querySelector(
        `div[data-symbol=${thisSymbol}]`
      );
      if (!thisSymbolWrapper) {
        thisSymbolWrapper = document.createElement("div");
        thisSymbolWrapper.setAttribute("data-symbol", thisSymbol);
        thisSymbolWrapper.setAttribute("class", "symbol-block");
        mainWrapper.appendChild(thisSymbolWrapper);
      }
      thisSymbolWrapper.innerHTML = `<div class='symbol-name'>${thisSymbol.toUpperCase()}-USDT</div><div class='lowHigh'><p>low:${Number(
        val.low24hr
      ).toFixed(2)}</p><p>high:${Number(val.high24hr).toFixed(
        2
      )}</p></div><div class='last'>${val.last}</div><div class=${
        Number(val.percentChange) >= 0 ? "percentage raise" : "percentage"
      }>${val.percentChange >= 0 ? "+" : ""}${Number(val.percentChange).toFixed(
        2
      )}%</div>`;
    }
  }

  let fetchInterval = 10000;
  let mainTimer = null;

  fetchLatestPrice();
  mainTimer = setTimeout(function inner() {
    try {
      fetchLatestPrice();
      mainTimer = setTimeout(inner, fetchInterval);
    } catch (e) {
      console.log(e);
      mainTimer = setTimeout(inner, fetchInterval);
    }
  }, fetchInterval);

  ipcRenderer.on("event-window-blur", e => {
    console.log("blured!");
    fetchInterval = 60000;
    // clearTimeout(mainTimer)
  });

  ipcRenderer.on("event-window-focus", e => {
    console.log("focus!");
    fetchInterval = 5000;
  });

  // change theme

  themeSwitch.addEventListener("click", e => {
    // const ifDarkend = Array.prototype.includes.call(
    //   outerWrapper.classList,
    //   "darken"
    // );
    const ifDarkend = themeCheckBox.checked;
    if (!ifDarkend) {
      localStorage.setItem("themeDarken", 1);
    } else {
      localStorage.removeItem("themeDarken");
    }
    themeCheckBox.checked = !ifDarkend;
    // if (ifDarkend) {
    outerWrapper.classList.toggle("darken");
    // }
  });

  // fetch now!
  lastFetchImg.addEventListener("click", e => {
    if (fetching) {
      return;
    }
    fetching = true;
    e.target.classList.add("spinning");
    fetchLatestPrice().then(data => {
      fetching = false;
      e.target.classList.remove("spinning");
    });
  });

  // add symbol
  addSymbolButton.addEventListener("click", e => {
    if (document.activeElement === adder) {
      return;
    }
    adder.style.display = "block";
    adder.focus();
    adder.classList.add("showed");
    if (!adder.dataset.pairs) {
      fetch("https://data.gateio.io/api2/1/pairs")
        .then(data => data.json())
        .then(data => {
          adder.dataset.pairs = JSON.stringify(
            data
              .filter(pair => /USDT/.test(pair))
              .map(pair => pair.toLowerCase())
          );
        });
    }
  });

  //
  // adder.addEventListener("blur", () => {
  //   adder.classList.remove("showed");
  //   setTimeout(() => {
  //     adder.style.display = "none";
  //   }, 500);
  // });
  addInput.addEventListener("input", e => {
    const inputVal = e.target.value;
    const display = document.querySelector("div.pairsDisplay");
    let pairs = adder.dataset.pairs;
    if (pairs) {
      pairs = JSON.parse(pairs);
      const pairListHTML = pairs
        .filter(pair => pair.match(inputVal))
        .map(pair => `<p data-pair=${pair}>${pair}</p>`)
        .join("");
      display.innerHTML = pairListHTML;
    }
  });
})();
