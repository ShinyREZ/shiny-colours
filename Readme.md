# Shiny Colours

Shiny Colours is a third-party client for the web game [THE IDOLM@STER SHINY COLORS](https://shinycolors.idolmaster.jp/).

## Features

All the features are optional. You can choose to disable them and use shiny-colours like a normal browser.

- Local cache
- Native app emulation with data download
- Unmute bgm
- Chinese localization (https://github.com/biuuu/ShinyColors)

## Known issues

- **WON'T FIX** Purchase in native mode is not available.  
  I don't recommend you to purchase within this client. Though this client is open-source and I can prove the distribution on GitHub it's safe, nobody knows whether the distribution he/she got is not patched by others.

## Screenshot
![image](https://user-images.githubusercontent.com/8667822/82006424-59909900-969a-11ea-8af7-9a50e07fdb8f.png)

Download data in native mode.

![image](https://user-images.githubusercontent.com/8667822/82006219-e38c3200-9699-11ea-8f3a-796bdde75e33.png)

Chinese localization in native mode.

![image](https://user-images.githubusercontent.com/8667822/82006624-d459b400-969a-11ea-933f-3597289efff2.png)

Chinese localization in browser mode.

## Addition

Also, you can make data download in your real client faster.(iOS & Android 7- only, as Android 7+ distrusts user-imported CA).  
First, you should launch a static server on your PC and make a symbol link from the assets folder to `www`.  
Then, use mitm apps(such as Surge and mitmproxy) to patch the request and redirect to your local server.  
Finally, share your network and open your native app. And then you can update assets in the app quickly :)