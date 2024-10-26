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
      console.log(responseToken);
      console.log("Dobijeni token je: " + responseToken.access_token);
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
  const startTime = Date.now();
  console.log(email);

  const authUrl =
    "https://accounts.google.com/o/oauth2/v2/auth" +
    "?client_id=650649576334-dngd1vk0hda7klm6g9n75bnusvhg2m5o.apps.googleusercontent.com" +
    "&response_type=code" +
    `&redirect_uri=https://${chrome.runtime.id}.chromiumapp.org/oauth2` +
    "&scope=https://www.googleapis.com/auth/youtube.readonly" +
    `&login_hint=${encodeURIComponent(email)}`;

  chrome.identity.launchWebAuthFlow(
    {
      url: authUrl,
      interactive: false
      //,
     // timeoutMsForNonInteractive: 100, //10000
      //abortOnLoadForNonInteractive: false,
    },
    function (redirectUrl) {
      if (chrome.runtime.lastError) {

        const endTime = Date.now();
        const elapsedTime = endTime - startTime;

        console.log(`Elapsed time: ${elapsedTime} milliseconds`);
        console.log("greska");

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
    chrome.storage.local.remove("tokens");
    
    fetch('https://www.youtube.com/getAccountSwitcherEndpoint?nocache=' + new Date().getTime(), {
      method: 'GET',
      credentials: 'include'
    })
    .then(response => response.text())
    .then(data => {
      console.log('Raw response:', data);
      const cleanedData = data.replace(/^\)\]\}'/, '');
      try {
        //const jsonData = JSON.parse(cleanedData);
        const emailRegex = /"email":\s*{[^}]*?"simpleText":\s*"([^"]+)"/;
        const match = cleanedData.match(emailRegex);
        
        if (match && match[1]) {
          const email = match[1];
          console.log("Updated email: ", email); 
          refreshTokens(email);
        } else {
          console.log('Email not found');
        }
      } catch (error) {
        console.error('JSON parsing error:', error);
      }
    })
    .catch(error => {
      console.error('There was a problem with the fetch operation:', error);
    });
  }
  return true;
});