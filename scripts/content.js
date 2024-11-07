chrome.storage.local.remove("tokens");
chrome.runtime.sendMessage({
  action: "handleTokenStorage",
});

function fetchData(playlistId, playlistName) {
  var currentLocation = window.location.href;

  chrome.storage.local.get("tokens", function (data) {
    var overlay = document.querySelector(".excel-extension-overlay");
    var exporting = document.querySelector(".excel-extension-exporting");

    if (exporting) {
      exporting.addEventListener("click", function (event) {
        event.stopPropagation();
      });
    }
    if (overlay) {
      overlay.addEventListener("click", function () {
        overlay.remove();
      });
    }
    var accessToken = data.tokens;
    if (accessToken) {
      chrome.runtime.sendMessage(
        {
          action: "sendDataToBackground",
          tokenValue: accessToken,
          playlistId: playlistId,
        },
        function (response) {
          var overlay = document.querySelector(".excel-extension-overlay");
          if (!overlay) {
            return;
          }
          if (response) {
            if (response.success) {
              var successLocation = window.location.href;
              if (currentLocation !== successLocation) {
                return;
              }
              const result = response.data;
              const dataNew = result.map((item, index) => ({
                Id: index + 1,
                Title: item.title,
                Url: item.url,
                "Date added": item.date,
              }));
              const ws = XLSX.utils.json_to_sheet(dataNew, {
                header: ["Id", "Title", "Url", "Date added"],
              });
              const date = new Date();

              const formattedDate = date.toISOString().split("T")[0];
              const formattedTime = date
                .toTimeString()
                .split(" ")[0]
                .replace(/:/g, "-");
              const fullFormatedDate = `${playlistName} ${formattedDate}_${formattedTime}`;
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
              XLSX.writeFile(wb, `${fullFormatedDate}.xlsx`);
            }
          } else {
          }
        }
      );
    } else {
      var tekst = document.querySelector(".waittext");
      tekst.textContent = "Unauthorized";
      var elementi = document.querySelectorAll(".litag");
      elementi.forEach((x) => {
        x.parentNode.removeChild(x);
      });
    }
  });
}

let navigating = false;

function checkProgress() {
  let previousUrl = window.location.pathname;

  if (previousUrl == "/feed/playlists") {
    const navigationProgress = document.querySelector(
      "body > ytd-app > yt-page-navigation-progress"
    );
    const currentValue = parseInt(
      navigationProgress.getAttribute("aria-valuenow"),
      10
    );
    if (currentValue === 100) {
      setTimeout(() => {
        if (navigating) return;
        navigating = true;
        chrome.runtime.sendMessage({
          action: "handleTokenStorage",
        });
        setTimeout(() => (navigating = false), 1000);
        refreshButtons();
      }, 1000);
    }
  }
}

navigation.addEventListener("navigate", (event) => {
  let previousUrl = window.location.pathname;
  const url = new URL(event.destination.url);

  var overlay = document.querySelector(".excel-extension-overlay");
  if (overlay) {
    overlay.remove();
  }
  if (
    (url.pathname === "/feed/playlists" && previousUrl !== "/feed/playlists") ||
    (url.pathname === "/feed/playlists" && previousUrl === "/feed/playlists")
  ) {
    addSlideButtonsListeners();
    const navigationProgress = document.querySelector(
      "body > ytd-app > yt-page-navigation-progress"
    );
    if (navigationProgress) {
      const observer = new MutationObserver(checkProgress);
      observer.observe(navigationProgress, { attributes: true });
    }
  }
});

function insertButtons() {
  var targetClass = "yt-lockup-view-model-wiz__metadata";
  const playlistElements = document.querySelectorAll(`.${targetClass}`);
  playlistElements.forEach((element) => {
    var linInElement = element.querySelector("a");
    var textElement = element
      .closest(".ytd-rich-item-renderer")
      .querySelector(".yt-collection-thumbnail-view-model");

    var playlistId;
    var playlistName;

    if (linInElement) {
      var linInElementHref = linInElement.href;
      const parts = linInElementHref.split("list=");
      playlistId = parts[1];
      playlistName = linInElement.textContent;
    }
    if (textElement.textContent.match(/\d/) && !playlistId.includes("WL")) {
      const newContent = document.createElement("div");
      newContent.setAttribute("class", "excel-extension-buttons-added");

      newContent.style.width = "auto";
      const exportButton = document.createElement("button");
      exportButton.textContent = "Export";
      exportButton.style.backgroundColor = "green";
      exportButton.style.color = "white";
      exportButton.style.display = "block";

      var exportHiddenField = document.createElement("input");

      exportHiddenField.setAttribute("type", "hidden");
      exportHiddenField.setAttribute("class", "excel-extension-playlistId");
      exportHiddenField.setAttribute("value", playlistId);

      var exportPlaylistName = document.createElement("input");

      exportPlaylistName.setAttribute("type", "hidden");
      exportPlaylistName.setAttribute("class", "excel-extension-playlistName");
      exportPlaylistName.setAttribute("value", playlistName);

      newContent.appendChild(exportHiddenField);
      newContent.appendChild(exportPlaylistName);
      newContent.appendChild(exportButton);

      exportButton.addEventListener("click", function () {
        var addedButtons = this.closest(".excel-extension-buttons-added");

        var hiddenInput = addedButtons.querySelector(
          ".excel-extension-playlistId"
        );

        var hiddenPlaylistName = addedButtons.querySelector(
          ".excel-extension-playlistName"
        );

        var playlistId = hiddenInput.value;
        var playlistName = hiddenPlaylistName.value;

        addOverlay();

        fetchData(playlistId, playlistName);
      });
      addSlideButtonsListeners();
      element.insertAdjacentElement("afterend", newContent);
    }
  });
}

function onElementReady(querySelector, callBack) {
  if (document.querySelector(querySelector)) {
    callBack();
  } else {
    setTimeout(() => onElementReady.call(this, ...arguments), 1000);
  }
}

onElementReady(".yt-lockup-view-model-wiz__metadata", () => {
  insertButtons();
});

function refreshButtons() {
  var targetClass = "yt-lockup-view-model-wiz__metadata";
  const playlistElements = document.querySelectorAll(`.${targetClass}`);
  var buttons = this.document.querySelectorAll(
    ".excel-extension-buttons-added"
  );
  var buttonArray = Array.from(buttons);

  if (buttonArray.length != playlistElements.length) {
    buttonArray.forEach((x) => (x.style.display = "none"));
    insertButtons();
  }
}

window.addEventListener("resize", function () {
  clearTimeout(window.resizeTimer);
  window.resizeTimer = setTimeout(refreshButtons, 1000);
});

function addSlideButtonsListeners() {
  var guideIcon = document.querySelector("#guide-icon");
  var guideButton = document.querySelector("#guide-button");

  guideIcon.addEventListener("click", addButtonsWhenSlide);
  guideButton.addEventListener("click", addButtonsWhenSlide);
}

function addButtonsWhenSlide() {
  var currentUrl = window.location.href;
  var drawer = document.querySelector("#guide");
  if (currentUrl === "https://www.youtube.com/feed/playlists") {
    if (drawer) {
      var isOpened = drawer.getAttribute("opened");
      if (isOpened !== null) {
        setTimeout(refreshButtons, 1000);
      } else {
        setTimeout(refreshButtons, 1000);
      }
    }
  }
}

function addOverlay() {
  var overlay = document.createElement("div");
  overlay.className = "excel-extension-overlay";
  overlay.style.position = "absolute";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
  overlay.style.zIndex = "100000";

  var overlayLoading = document.createElement("div");
  overlayLoading.className = "excel-extension-exporting";

  overlayLoading.style.height = "250px";
  overlayLoading.style.width = "250px";
  overlayLoading.style.margin = "auto";
  overlayLoading.style.background = "#595BD4";
  overlayLoading.style.position = "absolute";
  overlayLoading.style.transform = "translate(-50%, -50%)";

  overlayLoading.style.fontSize = "15px";
  overlayLoading.style.opacity = "1";
  overlayLoading.style.zIndex = "100001";

  var viewportWidth = window.innerWidth;
  var viewportHeight = window.innerHeight;
  var scrollX = window.scrollX;
  var scrollY = window.scrollY;

  var centerX = scrollX + viewportWidth / 2;
  var centerY = scrollY + viewportHeight / 2;
  overlayLoading.style.left = centerX + "px";
  overlayLoading.style.top = centerY + "px";

  var overlayLoadingCenter = document.createElement("div");
  overlayLoadingCenter.style.position = "absolute";
  overlayLoadingCenter.style.left = "0";
  overlayLoadingCenter.style.right = "0";
  overlayLoadingCenter.style.top = "50%";
  overlayLoadingCenter.style.width = "100px";
  overlayLoadingCenter.style.color = "#FFF";
  overlayLoadingCenter.style.margin = "auto";
  overlayLoadingCenter.style.transform = "translateY(-50%)";

  var pTag = document.createElement("p");
  pTag.textContent = "Please wait";
  pTag.style.textAlign = "center";
  pTag.className = "waittext";

  var span = document.createElement("span");
  span.style.position = "absolute";
  span.style.height = "10px";
  span.style.width = "84px";
  span.style.top = "50px";
  span.style.overflow = "hidden";

  var i1 = document.createElement("i");
  var i2 = document.createElement("i");

  i1.className = "litag";
  i2.className = "litag";

  i1.style.position = "absolute";
  i1.style.height = "4px";
  i1.style.width = "4px";
  i1.style.borderRadius = "50%";
  i1.style.animation = "wait 4s infinite";
  i1.style.left = "-28px";
  i1.style.background = "yellow";

  i2.style.position = "absolute";
  i2.style.height = "4px";
  i2.style.width = "4px";
  i2.style.borderRadius = "50%";
  i2.style.animation = "wait 4s infinite";
  i2.style.animationDelay = "0.8s";
  i2.style.left = "-21px";
  i2.style.background = "lightgreen";

  span.appendChild(i1);
  span.appendChild(i2);
  overlayLoadingCenter.appendChild(pTag);
  overlayLoadingCenter.appendChild(span);
  overlayLoading.appendChild(overlayLoadingCenter);
  overlay.appendChild(overlayLoading);
  var style = document.createElement("style");
  style.innerHTML = `
        @keyframes wait {
            0%   { left: -7px  }
            30%  { left: 52px  }
            60%  { left: 22px  }
            100% { left: 100px }
        }
    `;
  document.head.appendChild(style);

  var currentLocation = window.location.href;
  if (currentLocation == "https://www.youtube.com/feed/playlists") {
    var el = document.querySelector("body > ytd-app");
    el.appendChild(overlay);
  }
}
