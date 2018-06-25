const { ipcRenderer } = require("electron");
// const pako = require("pako");
const fs = require("fs");
const { throttle } = require("./tools");
(function() {
  let symbols =
    (localStorage.getItem("tokens_list") &&
      localStorage.getItem("tokens_list").split(",")) ||
    [];
  let prices = [];

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
    lastFetchImg.classList.add("spin");
    localStorage.setItem("tokens_list", symbols);
    for (let i of symbols) {
      promiseArr.push(
        fetch(`https://data.gateio.io/api2/1/ticker/${i}`).then(data =>
          data.json()
        )
      );
    }
    // return new Promise((resolve, reject))
    return Promise.all(promiseArr).then(data => {
      // console.log(data);
      lastFetchedTime.innerHTML = `${
        new Date().getHours() < 10
          ? "0" + new Date().getHours()
          : new Date().getHours()
      }:${
        new Date().getMinutes() < 10
          ? "0" + new Date().getMinutes()
          : new Date().getMinutes()
      }:${
        new Date().getSeconds() < 10
          ? "0" + new Date().getSeconds()
          : new Date().getSeconds()
      }`;
      renderToPage(data);
      // prices = [];
      for (let [index, val] of data.entries()) {
        const thisSymbol = symbols[index];
        prices[index] = Object.assign({}, val, { symbolName: thisSymbol });
      }
      // console.log(prices);
      lastFetchedTime.classList.remove("spin");
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
      thisSymbolWrapper.innerHTML = `<div class='symbol-name'>${thisSymbol.toUpperCase()}</div><div class='lowHigh'><p>low:${Number(
        val.low24hr
      ).toFixed(4)}</p><p>high:${Number(val.high24hr).toFixed(
        4
      )}</p></div><div class='last'>${Number(val.last).toFixed(
        2
      )}</div><div class="${
        Number(val.percentChange) >= 0 ? "percentage raise" : "percentage"
      }">${val.percentChange >= 0 ? "+" : ""}${Number(
        val.percentChange
      ).toFixed(2)}%</div>${editingList ? "<div class='delBtn'>-</div>" : ""}`;
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
      // console.log(e);
      mainTimer = setTimeout(inner, fetchInterval);
    }
  }, fetchInterval);

  ipcRenderer.on("event-window-blur", e => {
    // console.log("blured!");
    fetchInterval = 300000;
    // clearTimeout(mainTimer)
  });

  ipcRenderer.on("event-window-focus", e => {
    // console.log("focus!");
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

  // add symbol appear
  addSymbolButton.addEventListener("click", e => {
    if (document.activeElement === adder) {
      return;
    }
    adder.style.display = "block";
    requestAnimationFrame(() => {
      adder.classList.add("showed");
      addInput.focus();
    });
    // setTimeout(() => {
    // }, 0);
    if (!adder.dataset.pairs) {
      fetch("https://data.gateio.io/api2/1/pairs")
        .then(data => data.json())
        .then(data => {
          adder.dataset.pairs = JSON.stringify(
            data
              // .filter(pair => /USDT/.test(pair))
              .map(pair => pair.toLowerCase())
          );
        });
    }
  });

  // add symbol disappear
  document
    .querySelector("div.symbolAdder > p:first-of-type > span:last-of-type")
    .addEventListener("click", addSymbolDisappear);

  function addSymbolDisappear(e) {
    adder.classList.remove("showed");
    setTimeout(() => {
      adder.style.display = "none";
    }, 500);
  }
  // addInput.addEventListener("input", e => {

  // console.log(e.nativeEvent)
  // });
  // function appendPairsHtml (e) {

  // }
  // addInput.addEventListener('focus', e => {

  // })\
  addInput.addEventListener("keydown", e => {
    if (e.keyCode === 38 || e.keyCode === 40) {
      e.preventDefault();
    }
  });
  addInput.addEventListener(
    "keyup",
    (() => {
      let selectedIndex = -1;
      const display = document.querySelector("div.pairsDisplay");
      display.addEventListener(
        "mousemove",
        throttle(
          e => {
            // console.log(e);
            if (e.srcElement.nodeName === "P") {
              const thisChildIndex = Array.prototype.indexOf.call(
                display.childNodes,
                e.srcElement
              );
              selectedIndex = thisChildIndex;
              display.childNodes.forEach(
                (elem, index) =>
                  index === selectedIndex
                    ? elem.classList.add("pair_selected")
                    : elem.classList.remove("pair_selected")
              );
            }
          },
          200,
          true
        )
      );
      // let displayHandlePromise
      display.addEventListener("click", e => {
        if (selectedIndex !== -1) {
          const selectedPair = display.childNodes[selectedIndex].dataset.pair;
          // console.log(selectedPair);
          addInput.value = selectedPair;
          selectedIndex = -1;
          display.innerHTML = "";
        }
      });
      addInput.addEventListener("blur", e => {
        // console.log(e);
        setTimeout(() => {
          selectedIndex = -1;
          display.innerHTML = "";
        }, 200);
      });
      addInput.addEventListener("focus", e => {
        if (e.target.value) {
          appendPairsHtml(e);
        }
      });
      function appendPairsHtml(e) {
        let pairs = adder.dataset.pairs;
        if (pairs) {
          pairs = JSON.parse(pairs);
          const pairListHTML = pairs
            .filter(pair => pair.match(e.target.value))
            .map(pair => `<p data-pair=${pair}>${pair}</p>`)
            .join("");
          display.innerHTML = pairListHTML;
        }
        selectedIndex = -1;
      }
      return e => {
        if (!e.target.value) {
          display.innerHTML = "";
          return;
        }
        const { keyCode } = e;
        const displayChildren = display.childNodes;
        // const inputVal = e.target.value;
        // up
        if (keyCode === 38) {
          // e.preventDefault();
          if (selectedIndex > 0) {
            selectedIndex--;
            displayChildren.forEach(
              (elem, index) =>
                index === selectedIndex
                  ? (elem.classList.add("pair_selected"), elem.scrollIntoView())
                  : elem.classList.remove("pair_selected")
            );
          }
        } else if (keyCode === 40) {
          // e.preventDefault();
          if (selectedIndex < displayChildren.length - 1) {
            selectedIndex++;
            displayChildren.forEach(
              (elem, index) =>
                index === selectedIndex
                  ? (elem.classList.add("pair_selected"), elem.scrollIntoView())
                  : elem.classList.remove("pair_selected")
            );
          }
        } else if (keyCode === 13) {
          if (selectedIndex !== -1) {
            const selectedPair = display.childNodes[selectedIndex].dataset.pair;
            e.target.value = selectedPair;
            selectedIndex = -1;
            display.innerHTML = "";
          } else {
            addSymbolHandler(e);
          }
        } else {
          appendPairsHtml(e);
        }
        // console.log(selectedIndex);
      };
    })()
  );
  function addSymbolHandler(e) {
    if (!addInput.value) {
      addInput.classList.add("bounce");
      addInput.focus();
      setTimeout(() => {
        addInput.classList.remove("bounce");
      }, 500);
    } else {
      const selectedValue = addInput.value;
      const selectableValue = JSON.parse(adder.dataset.pairs);
      addInput.value = "";
      if (selectableValue.includes(selectedValue)) {
        addSymbolDisappear(e);
        if (!symbols.includes(selectedValue)) {
          // debugger;
          symbols.push(selectedValue);
        }
        fetchLatestPrice();
      } else {
        addInput.classList.add("bounce");
        addInput.focus();
        setTimeout(() => {
          addInput.classList.remove("bounce");
        }, 500);
      }
    }
  }
  document
    .querySelector(".symbolAdder > button")
    .addEventListener("click", addSymbolHandler);

  let editingList = false;
  document.querySelector("div.editWrapper").addEventListener(
    "click",
    (() => {
      return e => {
        const symbolBlocks = document.querySelectorAll("div.symbol-block");
        Array.prototype.forEach.call(symbolBlocks, (elem, index) => {
          if (editingList) {
            setTimeout(() => elem.removeChild(elem.lastElementChild), 300);
          } else {
            const appendedDelBtn = document.createElement("div");
            appendedDelBtn.innerHTML = "-";
            appendedDelBtn.classList.add("delBtn");
            elem.appendChild(appendedDelBtn);
            // elem.style.flexShrink = "1";
          }
          elem.classList.toggle("flexShrink1");
        });
        editingList = !editingList;
      };
    })()
  );
  setTimeout(function inner(index = 0) {
    // let index = index || 0
    const priceLen = prices.length;
    // console.log(priceLen, prices, index);
    if (priceLen) {
      ipcRenderer.send("price-update", prices[index]);
    } else {
      ipcRenderer.send("price-update", {
        symbolName: "please add symbol",
        last: 0
      });
    }
    // console.log(index, priceLen);
    setTimeout(inner, 5000, index >= priceLen - 1 ? 0 : ++index);
  }, 5000);
})();
