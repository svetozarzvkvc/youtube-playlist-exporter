chrome.runtime.onInstalled.addListener(function () {
  const authUrl =
    "https://accounts.google.com/o/oauth2/v2/auth" +
    "?client_id=650649576334-dngd1vk0hda7klm6g9n75bnusvhg2m5o.apps.googleusercontent.com" +
    "&response_type=code" +
    `&redirect_uri=https://${chrome.runtime.id}.chromiumapp.org/oauth2` +
    "&scope=https://www.googleapis.com/auth/youtube.readonly" +
    "&access_type=offline";

  chrome.identity.launchWebAuthFlow(
    {
      url: authUrl,
      interactive: true,
    },
    function (redirectUrl) {
      if (chrome.runtime.lastError) {
        return;
      }
      const code = extractCodeFromUrl(redirectUrl);
      exchangeCodeForTokens(code);
      clearAlarmsAndUpdateStorage();
    }
  );
});

function extractCodeFromUrl(url) {
  const params = new URLSearchParams(url.split("?")[1]);
  return params.get("code");
}

function exchangeCodeForTokens(code) {
  const endpointUrl = "https://getapidomain.runasp.net/api/auth";
  const requestBody = {
    token: code
  };
  fetch(endpointUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  }).then((response) => response.json())
  .then((response) => {
    var responseToken = JSON.parse(response.content)
    chrome.storage.local.set({ tokens: responseToken.access_token }, function () {
      if (chrome.runtime.lastError) {
        return;
      }
    });
  })
}

function refreshTokens(id) {
  var id = 0;
  const authUrl =
    "https://accounts.google.com/o/oauth2/v2/auth" +
    "?client_id=650649576334-dngd1vk0hda7klm6g9n75bnusvhg2m5o.apps.googleusercontent.com" +
    "&response_type=code" +
    `&redirect_uri=https://${chrome.runtime.id}.chromiumapp.org/oauth2` +
    "&scope=https://www.googleapis.com/auth/youtube.readonly" +
    `&authuser=${id}` +
    "&access_type=offline";

  chrome.identity.launchWebAuthFlow(
    {
      url: authUrl,
      interactive: false,
      timeoutMsForNonInteractive: 10000,
      abortOnLoadForNonInteractive: false,
    },
    function (redirectUrl) {
      if (chrome.runtime.lastError) {
        id++;
        refreshTokens(id);
        return;
      }
      const code = extractCodeFromUrl(redirectUrl);
      exchangeCodeForTokens(code);
    }
  );
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "getkeys") {
    chrome.storage.local.get("isTokenRefreshed", function (data) {
      if (
        data == undefined ||
        data.isTokenRefreshed == undefined ||
        data.isTokenRefreshed == false
      ) {
        refreshTokens();
        createAlarm();
        chrome.storage.local.set({ isTokenRefreshed: true });
      }
    });
  }
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "sendDataToBackground") {
    const tokenValue = request.tokenValue;
    const playlistId = request.playlistId;
    const endpointUrl = "https://getapidomain.runasp.net/api/playlists";
    const requestBody = {
      token: tokenValue,
      playlistId: playlistId,
    };

    fetch(endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })
      .then((response) => response.json())
      .then((data) => {
        sendResponse({
          success: true,
          data: data,
        });
      })
    return true;
  }
});

function clearAlarmsAndUpdateStorage() {
  chrome.alarms.clear("refreshTokenAlarm");
  chrome.storage.local.get("isTokenRefreshed", function (data) {
    if (
      data.isTokenRefreshed == false
    ) {
      return;
    }
    else{
      chrome.storage.local.set({ isTokenRefreshed: false });
    }
  });
}

function createAlarm() {
  chrome.alarms.get("refreshTokenAlarm", (alarm) => {
    if (!alarm) {
      chrome.alarms.create("refreshTokenAlarm", { periodInMinutes: 60 });
    }
  });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "refreshTokenAlarm") {
    refreshTokens();
  }
});

chrome.windows.onCreated.addListener(() => {
  clearAlarmsAndUpdateStorage();
});