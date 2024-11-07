function extractCodeFromUrl(url) {
  const params = new URLSearchParams(url.split("?")[1]);
  return params.get("code");
}

function exchangeCodeForTokens(code) {
  const endpointUrl = "https://getapidomain.runasp.net/api/auth";
  const requestBody = {
    token: code,
  };
  fetch(endpointUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  })
    .then((response) => response.json())
    .then((response) => {
      var responseToken = JSON.parse(response.content);
      chrome.storage.local.set({
        tokens: responseToken.access_token
      },
      function() {
        if (chrome.runtime.lastError) {
          return;
        }
      });
    });
}

function refreshTokens(email = null) {
  const authUrl =
    "https://accounts.google.com/o/oauth2/v2/auth" +
    "?client_id=650649576334-dngd1vk0hda7klm6g9n75bnusvhg2m5o.apps.googleusercontent.com" +
    "&response_type=code" +
    `&redirect_uri=https://${chrome.runtime.id}.chromiumapp.org/oauth2` +
    "&scope=https://www.googleapis.com/auth/youtube.readonly" +
    `&login_hint=${email}`;

  chrome.identity.launchWebAuthFlow(
    {
      url: authUrl,
      interactive: false
    },
    function (redirectUrl) {
      if (chrome.runtime.lastError) {

        const authUrl =
          "https://accounts.google.com/o/oauth2/v2/auth" +
          "?client_id=650649576334-dngd1vk0hda7klm6g9n75bnusvhg2m5o.apps.googleusercontent.com" +
          "&response_type=code" +
          `&redirect_uri=https://${chrome.runtime.id}.chromiumapp.org/oauth2` +
          "&scope=https://www.googleapis.com/auth/youtube.readonly"; 

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
          }
        );
        return;
      }
      const code = extractCodeFromUrl(redirectUrl);
      exchangeCodeForTokens(code);
    }
  );
}

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
      });
    return true;
  }
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "handleTokenStorage") {
    
    fetch('https://www.youtube.com/getAccountSwitcherEndpoint?nocache=' + new Date().getTime(), {
      method: 'GET',
      credentials: 'include'
    })
    .then(response => response.text())
    .then(data => {
      const cleanedData = data.replace(/^\)\]\}'/, '');
      try {
        const emailRegex = /"email":\s*{[^}]*?"simpleText":\s*"([^"]+)"/;
        const match = cleanedData.match(emailRegex);
        
        if (match && match[1]) {
          const email = match[1];
          refreshTokens(email);
        } else {
        }
      } catch (error) {
      }
    })
    .catch(error => {
    });
  }
  return true;
});