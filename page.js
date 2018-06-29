(function() {
  const { ipcRenderer, shell } = require("electron");
  // const pako = require("pako");
  const fs = require("fs");
  const { throttle, showTip } = require("./tools");
  const mainWrapper = document.querySelector(".scrollable");
  const outerWrapper = document.querySelector("div.mainWrapper");
  const themeSwitch = document.querySelector(".themeWrapper > span.switch");
  const themeCheckBox = document.querySelector(".switchWrapper > input");
  const showInfoSwitch = document.querySelector(
    ".showInfoSwitch > span.switch"
  );
  const showInfoCheckBox = document.querySelector(".showInfoSwitch > input");
  const lastFetchedTime = document.querySelector(
    ".infoAndThettings > span:first-of-type > span"
  );
  const lastFetchImg = document.querySelector(
    ".infoAndThettings > span:first-of-type > img"
  );
  const addSymbolButton = document.querySelector(".controls > p > span.add");
  const adder = document.querySelector("div.symbolAdder");
  const priceAlerts = document.querySelector("div.priceAlerts");
  const addInput = document.querySelector("input.addInput");
  const foregroundFetchIntervalInput = document.querySelector(
    "p.foreBgRefresh > input"
  );
  const backgroundFetchIntervalInput = document.querySelector(
    "p.bgRefresh > input"
  );

  // reading datas
  let symbols =
    (localStorage.getItem("tokens_list") &&
      localStorage.getItem("tokens_list").split(",")) ||
    [];
  let prices = [];
  let lastFetchPrice = [];
  let alerts =
    (localStorage.getItem("alerts") &&
      JSON.parse(localStorage.getItem("alerts"))) ||
    {};

  const ifDarkend = localStorage.getItem("themeDarken");
  if (ifDarkend) {
    outerWrapper.classList.add("darken");
    themeCheckBox.checked = true;
  }
  const ifInfoShowed = localStorage.getItem("showInfo");
  if (ifInfoShowed === "0") {
    ipcRenderer.send("signal-info-show", false);
    showInfoCheckBox.checked = false;
  } else if (ifInfoShowed === "1") {
    showInfoCheckBox.checked = true;
  }
  let foregroundFetchInterval =
    (localStorage.getItem("foregroundFetchInterval") &&
      Number(localStorage.getItem("foregroundFetchInterval"))) ||
    15;
  let backgroundFetchInterval =
    (localStorage.getItem("backgroundFetchInterval") &&
      Number(localStorage.getItem("backgroundFetchInterval"))) ||
    120;
  foregroundFetchIntervalInput.value = foregroundFetchInterval;
  backgroundFetchIntervalInput.value = backgroundFetchInterval;
  foregroundFetchIntervalInput.addEventListener("blur", e => {
    const val = Number(e.target.value);
    if (val < 5) {
      e.target.value = "5";
      return showTip("最小更新间隔为5秒!");
    }
    if (foregroundFetchInterval !== val) {
      clearTimeout(mainTimer);
      // foregroundFetchInterval = e.target.value;
      fetchInterval = foregroundFetchInterval = val;
      showTip("前台更新时间更新成功!");
      mainTimer = setTimeout(mainProcess, fetchInterval * 1000);
      localStorage.setItem("foregroundFetchInterval", foregroundFetchInterval);
    }
  });
  backgroundFetchIntervalInput.addEventListener("blur", e => {
    const val = Number(e.target.value);
    if (val < 5) {
      e.target.value = "5";
      return showTip("最小更新间隔为5秒!");
    }
    if (backgroundFetchInterval !== val) {
      backgroundFetchInterval = val;
      showTip("后台更新时间更新成功!");
      localStorage.setItem("backgroundFetchInterval", backgroundFetchInterval);
    }
  });

  // if is fetching data...
  let fetching = false;

  function fetchLatestPrice() {
    let promiseArr = [];
    lastFetchImg.classList.add("spinning");
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
      renderToPage(data);
      lastFetchPrice = prices;
      prices = [];
      for (let [index, val] of data.entries()) {
        const thisSymbol = symbols[index];
        prices[index] = Object.assign({}, val, { symbolName: thisSymbol });
      }
      // console.log(prices);
      lastFetchImg.classList.remove("spinning");
      // detect price alerts
      // console.log(alerts, lastFetchPrice, prices);
      for (let symbol in alerts) {
        const params = alerts[symbol];
        const lastCheckedPrice = lastFetchPrice.filter(
          priceRecord => priceRecord.symbolName === symbol
        )[0];
        const latestPrice = prices.filter(
          priceRecord => priceRecord.symbolName === symbol
        )[0];
        // console.log(params, lastCheckedPrice, latestPrice);
        if (lastCheckedPrice && latestPrice) {
          const alertPrice = Number(params.price);
          const lastPrice = Number(lastCheckedPrice.last);
          const nowPrice = Number(latestPrice.last);
          if (
            (nowPrice > alertPrice && lastPrice < alertPrice) ||
            (nowPrice < alertPrice && lastPrice > alertPrice) ||
            nowPrice === alertPrice
          ) {
            new Notification(
              `${symbol} price achieved! latestPrice: ${nowPrice}`
            );
          }
        }
      }
      return data;
    });
    // console.log(resps);
  }

  // mainWrapper.

  function renderToPage(dataArr) {
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
    for (let [index, val] of dataArr.entries()) {
      const thisSymbol = symbols[index];
      let thisSymbolWrapper = document.querySelector(
        `div[data-symbol=${thisSymbol}]`
      );
      if (!thisSymbolWrapper) {
        thisSymbolWrapper = document.createElement("div");
        thisSymbolWrapper.setAttribute("data-symbol", thisSymbol);
        thisSymbolWrapper.setAttribute(
          "class",
          `symbol-block ${editingList ? "flexShrink1" : ""}`
        );
        mainWrapper.appendChild(thisSymbolWrapper);
      }
      thisSymbolWrapper.innerHTML = `<div class='symbol-name'><span>${thisSymbol
        .split("_")[0]
        .toUpperCase()}</span><span>/${thisSymbol
        .split("_")[1]
        .toUpperCase()}</span></div><div class='lowHigh'><p class="pricemore">${Number(
        val.high24hr
      ).toFixed(4)}</p><p class="pricesmall">${Number(val.low24hr).toFixed(
        4
      )}</p></div><div class='last'>${Number(val.last).toFixed(
        2
      )}</div><div class="${
        Number(val.percentChange) >= 0 ? "percentage raise" : "percentage"
      }">${val.percentChange >= 0 ? "+" : ""}${Number(
        val.percentChange
      ).toFixed(2)}%</div>${
        editingList
          ? "<div class='controlWrapper'><span class='delBtn'>-</span><span class='dragBtn'></span></div>"
          : ""
      }`;
    }
  }

  // change theme

  function changeTeme(e) {
    const ifDarkend = themeCheckBox.checked;
    if (!ifDarkend) {
      localStorage.setItem("themeDarken", 1);
    } else {
      localStorage.removeItem("themeDarken");
    }
    themeCheckBox.checked = !ifDarkend;
    // if (ifDarkend) {
    outerWrapper.classList.toggle("darken");
  }
  themeSwitch.addEventListener("click", changeTeme);
  themeSwitch.addEventListener("keydown", e => {
    if (e.keyCode === 32 || e.keyCode === 13) {
      changeTeme(e);
    }
  });
  function changeInfoShow(e) {
    const ifInfoShowed = showInfoCheckBox.checked;
    localStorage.setItem("showInfo", ifInfoShowed ? 0 : 1);
    ipcRenderer.send("signal-info-show", !ifInfoShowed);
    showInfoCheckBox.checked = !ifInfoShowed;
  }

  showInfoSwitch.addEventListener("click", changeInfoShow);
  showInfoSwitch.addEventListener("keydown", e => {
    if (e.keyCode === 32 || e.keyCode === 13) {
      changeInfoShow(e);
    }
  });
  // fetch now!
  lastFetchImg.addEventListener("click", e => {
    if (fetching) {
      return;
    }
    fetching = true;
    // e.target.classList.add("spinning");
    fetchLatestPrice().then(data => {
      fetching = false;
      // e.target.classList.remove("spinning");
    });
  });

  function renderPriceAlerts() {
    const priceAlertsListWrapper = document.querySelector(
      ".priceAlertsListwrapper"
    );
    priceAlertsListWrapper.innerHTML = Object.keys(alerts)
      .map(
        key =>
          `<p data-pairname='${key}'><span>交易对:${key.replace(
            "_",
            "/"
          )}</span><span>价格:${
            alerts[key]["price"]
          }</span><span class='delBtn'>X</span></p>`
      )
      .concat(
        "<p><button class='green addPriceAlerts'>增加价格提醒</button></p>"
      )
      .join("");
  }
  let addMode;
  const showModal = (() => {
    const adderTitle = adder.querySelector("p:first-child > span:first-child");
    const priceInputWrapper = adder.querySelector(".priceInputWrapper");
    const shade = document.querySelector(".modalShade");
    // const priceInput = adder.querySelector(".priceInput");

    return (whichModal, mode) => {
      // if (document.activeElement === adder) {
      //   return;
      // }
      const modal = document.querySelector(`div.modal.${whichModal}`);
      if (whichModal === "symbolAdder") {
        if (mode === "alert") {
          adderTitle.innerHTML = "增加价格通知";
          priceInputWrapper.style.display = "flex";
        } else {
          adderTitle.innerHTML = "增加交易对";
          priceInputWrapper.style.display = "none";
        }
      } else if (whichModal === "priceAlerts") {
        renderPriceAlerts();
      }
      modal.style.display = "block";
      shade.style.display = "block";
      setTimeout(() => {
        modal.classList.add("showed");
        shade.classList.add("showed");
        whichModal === "symbolAdder" && addInput.focus();
      }, 50);
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
    };
  })();
  // add symbol appear
  addSymbolButton.addEventListener("click", e => {
    addMode = "token";
    showModal("symbolAdder", addMode);
  });

  // show price alert button
  document.querySelector("span.alarm").addEventListener("click", e => {
    showModal("priceAlerts", addMode);
  });

  // add price alerts
  document
    .querySelector(".priceAlertsListwrapper")
    .addEventListener("click", e => {
      if (e.srcElement.tagName === "BUTTON") {
        addMode = "alert";
        showModal("symbolAdder", addMode);
      } else if (e.srcElement.classList.contains("delBtn")) {
        const pairName = e.srcElement.parentElement.dataset.pairname;
        delete alerts[pairName];
        localStorage.setItem("alerts", JSON.stringify(alerts));
        showTip("删除价格提醒成功!");
        renderPriceAlerts();
      }
    });

  // modal disappear
  document
    .querySelector("div.symbolAdder > p:first-of-type > span:last-of-type")
    .addEventListener("click", () => modalDisappear("symbolAdder"));
  document
    .querySelector("div.priceAlerts > p:first-of-type > span:last-of-type")
    .addEventListener("click", () => modalDisappear("priceAlerts"));

  function modalDisappear(whichModal) {
    const modal = document.querySelector(`div.modal.${whichModal}`);
    const shade = document.querySelector("div.modalShade");
    const modals = document.querySelectorAll("div.modal.showed");
    modal.classList.remove("showed");
    modals.length === 1 && shade.classList.remove("showed");
    if (whichModal === "symbolAdder") {
      addInput.value = "";
      addInput.blur();
      adder.querySelector("input.priceInput").value = "";
      adder.querySelector("input.priceInput").blur();
    }
    setTimeout(() => {
      modal.style.display = "none";
      modals.length === 1 && (shade.style.display = "none");
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
          display.style.display = "none";
          display.innerHTML = "";
        }
      });
      addInput.addEventListener("blur", e => {
        // console.log(e);
        setTimeout(() => {
          selectedIndex = -1;
          display.style.display = "none";
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
          display.style.display = "block";
          display.innerHTML = pairListHTML;
        }
        selectedIndex = -1;
      }
      return e => {
        if (!e.target.value) {
          display.innerHTML = "";
          display.style.display = "none";
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
                  ? (elem.classList.add("pair_selected"),
                    elem.scrollIntoView(),
                    (addInput.value = elem.dataset.pair))
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
                  ? (elem.classList.add("pair_selected"),
                    elem.scrollIntoViewIfNeeded(),
                    (addInput.value = elem.dataset.pair))
                  : elem.classList.remove("pair_selected")
            );
          }
        } else if (keyCode === 13) {
          if (selectedIndex !== -1) {
            const selectedPair = display.childNodes[selectedIndex].dataset.pair;
            e.target.value = selectedPair;
            selectedIndex = -1;
            display.style.display = "none";
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
    function inputBounce(elem) {
      elem.classList.add("bounce");
      elem.focus && elem.focus();
      setTimeout(() => {
        elem.classList.remove("bounce");
      }, 500);
    }
    if (!addInput.value) {
      return inputBounce(addInput);
    } else {
      const selectedValue = addInput.value;
      const selectableValue = JSON.parse(adder.dataset.pairs);
      const selectedAlertPrice = adder.querySelector("input.priceInput");
      if (!selectableValue.includes(selectedValue)) {
        addInput.value = "";
        return inputBounce(addInput);
      }
      if (addMode === "alert") {
        // if (selectableValue.includes(selectedValue))
        if (!selectedAlertPrice.value || selectedAlertPrice.value <= 0) {
          return inputBounce(selectedAlertPrice);
        }
        showTip(`${alerts[selectedValue] ? "更新" : "新增"}价格提醒成功!`);
        alerts[selectedValue] = {
          price: selectedAlertPrice.value,
          persist: true
        };
        localStorage.setItem("alerts", JSON.stringify(alerts));
        renderPriceAlerts();
        // modalDisappear();
      }
      modalDisappear("symbolAdder");
      if (!symbols.includes(selectedValue)) {
        // debugger;
        symbols.push(selectedValue);
        fetchLatestPrice();
      }
      // if (selectableValue.includes(selectedValue)) {

      // } else {
      //   addInput.classList.add("bounce");
      //   addInput.focus();
      //   setTimeout(() => {
      //     addInput.classList.remove("bounce");
      //   }, 500);
      // }
    }
  }
  document
    .querySelector(".symbolAdder > button")
    .addEventListener("click", addSymbolHandler);

  // editing status
  let editingList = false;
  document.querySelector("span.editWrapper").addEventListener(
    "click",
    (() => {
      const editBtn = document.querySelector("span.editList");
      const finishEditBtn = document.querySelector("span.finishEdit");
      return e => {
        const symbolBlocks = document.querySelectorAll("div.symbol-block");
        Array.prototype.forEach.call(symbolBlocks, (elem, index) => {
          if (editingList) {
            setTimeout(() => {
              // elem.removeChild(elem.childNodes[4]);
              elem.removeChild(elem.lastElementChild);
            }, 300);
          } else {
            const controlWrapper = document.createElement("div");
            controlWrapper.innerHTML = `<span class='delBtn'>-</span><span class='dragBtn'></span>`;
            controlWrapper.classList.add("controlWrapper");
            // controlWrapper.classList.add("delBtn");
            elem.appendChild(controlWrapper);

            // move element
            // const moveDragBtn = document.createElement("div");
            // moveDragBtn.classList.add("dragBtn");
            // moveDragBtn.innerHTML = "hehda";
            // elem.appendChild(moveDragBtn);
            // elem.style.flexShrink = "1";
          }
          elem.classList.toggle("flexShrink1");
        });
        // editBtn.classList.toggle("showed");
        // setTimeout(() => finishEditBtn.classList.toggle("showed"), 400);
        (editingList ? finishEditBtn : editBtn).classList.toggle("showed");
        setTimeout(
          (editing => () => {
            (editing ? editBtn : finishEditBtn).classList.toggle("showed");
            // console.log(editing);
          })(editingList),
          400
        );
        if (!editingList) {
          clearTimeout(mainTimer);
        } else {
          mainTimer = setTimeout(mainProcess, fetchInterval * 1000);
        }
        editingList = !editingList;
      };
    })()
  );

  // del  and grap&drop btn handler
  mainWrapper.addEventListener("click", e => {
    // del btn clicked
    if (e.srcElement.classList.contains("delBtn")) {
      // remove dom element
      const parent = e.target.parentElement.parentElement;
      const symbolName = parent.dataset.symbol;
      parent.remove();
      // modify local storage
      symbols.splice(symbols.indexOf(symbolName), 1);
      localStorage.setItem("tokens_list", symbols);
      if (alerts[symbolName]) {
        delete alerts[symbolName];
        showTip(`删除价格提醒: ${symbolName.replace("_", "/")}`);
        localStorage.setItem("alerts", JSON.stringify(alerts));
      }
    }
  });
  mainWrapper.addEventListener(
    "mousedown",
    (() => {
      // const mainWrapperTop = mainWrapper.getBoundingClientRect().top;
      let blockCount;
      let blockDimension;
      let placeHoderDiv;
      let draggedBlock;
      let draggedBlockIndex;
      let mouseDragStartingY;
      let latestMovedIndex;
      // let mouseDragStartingY;
      mainWrapper.addEventListener("mousemove", e => {
        if (draggedBlock) {
          // console.log(e, draggedBlock);
          // draggedmouseDragStartingY = draggedBlock.getBoundingClientRect();
          // change draggedElem position
          const draggedDistance = e.clientY - mouseDragStartingY;
          draggedBlock.style.top = `${draggedBlockIndex *
            blockDimension.height +
            draggedDistance}px`;
          // change placeholder div position
          // console.log(draggedDistance);
          const draggedBlockCount =
            draggedDistance > 0
              ? Math.floor(draggedDistance / blockDimension.height)
              : Math.ceil(draggedDistance / blockDimension.height);
          // console.log(draggedBlockCount);
          // make placeholder move {draggedBlockCount} blocks
          // console.log(draggedBlockCount);
          // console.log(draggedDistance);
          if (
            draggedBlockCount >= 0 - draggedBlockIndex &&
            draggedBlockCount < blockCount - draggedBlockIndex
          ) {
            if (latestMovedIndex !== draggedBlockCount) {
              latestMovedIndex = draggedBlockCount;
              // console.log(latestMovedIndex);
              mainWrapper.removeChild(placeHoderDiv);
              mainWrapper.insertBefore(
                placeHoderDiv,
                mainWrapper.childNodes[
                  draggedBlockIndex +
                    draggedBlockCount +
                    (latestMovedIndex > 0 ? 1 : 0)
                ]
              );
            }
          }
          // if ()
        }
      });
      mainWrapper.addEventListener("mouseup", e => {
        if (draggedBlock) {
          mainWrapper.removeChild(draggedBlock);
          mainWrapper.insertBefore(
            draggedBlock,
            placeHoderDiv.nextElementSibling
          );
          mainWrapper.removeChild(placeHoderDiv);

          draggedBlock.style.position = "";
          draggedBlock.style.top = "";
          draggedBlock = null;
          localStorage.setItem(
            "tokens_list",
            Array.prototype.map.call(
              mainWrapper.childNodes,
              (elem, index) => elem.dataset.symbol
            )
          );
        }
      });
      return e => {
        // console.log(e);
        if (e.srcElement.classList.contains("dragBtn")) {
          draggedBlock = e.target.parentElement.parentElement;
          blockDimension = draggedBlock.getBoundingClientRect();
          // record starting pos and count
          // draggedBlock = draggedBlock;
          draggedBlockIndex = Array.prototype.indexOf.call(
            mainWrapper.childNodes,
            draggedBlock
          );
          blockCount = mainWrapper.childElementCount;
          // draggedStartingTop = draggedBlock.getBoundingClientRect().top;
          mouseDragStartingY = e.clientY;

          // create placeholder div
          placeHoderDiv = document.createElement("div");
          placeHoderDiv.setAttribute(
            "style",
            `width: 100%;height: ${blockDimension.height}px`
          );
          draggedBlock.parentElement.insertBefore(
            placeHoderDiv,
            draggedBlock.nextElementSibling
          );

          draggedBlock.style.position = "absolute";
          // draggedBlock.style.left = "10px";
          // draggedBlock.style.top = "130px";
          // mainWrapper.appendChild(parentBlock);
          // console.log(draggedStartingTop, startingTop);
        }
      };
    })()
  );

  // menu handling...
  let menuExpanded = false;
  document.querySelector("span.menuWrapper").addEventListener(
    "click",
    (() => {
      const menuIcon = document.querySelector("span.menuIcon");
      const menu = document.querySelector("div.menu");
      const menuShade = document.querySelector("div.menuShade");
      function toggleMenuStatus(e) {
        menuIcon.classList.toggle("expanded");
        if (!menuExpanded) {
          menu.style.display = "block";
          themeSwitch.focus();
        } else {
          setTimeout(() => {
            menu.style.display = "none";
          }, 500);
        }
        setTimeout(() => {
          menu.classList.toggle("showed");
        }, 50);
        menuExpanded = !menuExpanded;
      }
      menuShade.addEventListener("click", toggleMenuStatus);
      return toggleMenuStatus;
    })()
  );

  // shell to ext links...
  document.querySelector("p.about").addEventListener("click", e => {
    if (e.srcElement.tagName === "A") {
      e.preventDefault();
      // console.log("a!");
      shell.openExternal(e.srcElement.href);
    }
  });

  document.querySelector("p.exit").addEventListener("click", e => {
    ipcRenderer.send("process_exit");
  });

  // document.querySelector("button.testBtn").addEventListener("click", () => {
  //   showTip("hehdasdsds");
  // });

  // send prices to tray
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

  // start main process
  let fetchInterval = foregroundFetchInterval;
  let mainTimer = null;

  fetchLatestPrice();
  function mainProcess() {
    console.log("main run!");
    try {
      fetchLatestPrice();
      mainTimer = setTimeout(mainProcess, fetchInterval * 1000);
    } catch (e) {
      // console.log(e);
      mainTimer = setTimeout(mainProcess, fetchInterval * 1000);
    }
  }
  mainProcess();

  ipcRenderer.on("event-window-blur", e => {
    // console.log("blured!");
    clearTimeout(mainTimer);
    fetchInterval = backgroundFetchInterval;
    mainTimer = setTimeout(mainProcess, fetchInterval * 1000);
  });

  ipcRenderer.on("event-window-focus", e => {
    // console.log("focus!");
    clearTimeout(mainTimer);
    fetchInterval = foregroundFetchInterval;
    mainTimer = mainProcess();
  });
})();
