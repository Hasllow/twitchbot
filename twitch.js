/* eslint-disable no-empty */
const puppeteer = require('puppeteer');
const treekill = require('tree-kill');
const rimraf = require('rimraf');
const path = require('path');
const fs = require('fs');

// Retira limite de listeners
process.setMaxListeners(0);

// Lista dos streamers que deseja assistir
// Parte final da url do streamer, por exemplo: http://twitch.tv/alanzoka, alanzoka é o que vai na lista
const streamers = [];

// Const streamers = ["ligadojorel",];

// Seu Cookie de login
const authToken = '';

// Depois de 15 minutos, verifica se tem mais alguma live aberta
// Caso queria alterar esse tempo, altere o valor dos minutos abaixo
const minutos = 15;

const baseDir = path.join(__dirname, 'TwitchBot');

const pathToChrome = fs.existsSync('C:/Program Files (x86)/Google/Chrome/Application/chrome.exe')
  ? 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  : 'C:/Program Files/Google/Chrome/Application/chrome.exe';

// Cria um objeto com todos os streamers da lista e a propriedade live
// A propriedade consiste em true para on e false para off
// Caso seja false, o bot verifica se o streamer está on a cada X minutos
// Caso seja true, o bot passa para o próximo streamer da lista
const streamersObj = {};
for (const key of streamers) {
  streamersObj[key] = {live: false};
}

// Cria a pasta da sessão do usuário
const setupSession = () => {
  const userDir = path.join(__dirname, 'TwitchBot', String(Date.now()));
  fs.mkdirSync(userDir, { recursive: true });
  return userDir;
};

// Dá um pause de sincrono
const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Deleta a pasta designada no path
const cleanUp = (path) => rimraf(path, () => {});

// Load na page, e verifica se os 2 elementos estão presentes(30seg), caso não estejam, dá reload novamente
const load = async (page, url) => {

  let check1 = null;
  let check2 = null;

  while (check1 === null && check2 === null) {
    try {
      await page.goto(`https://twitch.tv/${url}`);
      check1 = await page.waitForSelector('.ScAvatar-sc-12nlgut-0.IuKGg.tw-avatar', {timeout: 30000});
      check2 = await page.waitForSelector('.follow-btn__follow-btn', {timeout: 30000});     
    } catch (error) { }
  }
};

// Main Bot
const Bot = async (url) => {
  let clicks = 0;
  let interations = 0;
  let timeClick;

  const userDataDir = setupSession();
  const cookies = [ { name: 'auth-token', value: authToken } ];

  const browser = await puppeteer.launch({ headless: true, executablePath: pathToChrome, userDataDir });
  const page = await browser.newPage();

  // Seletor do báu de bônus
  const bau = '.ScCoreButton-sc-1qn4ixc-0.ScCoreButtonSuccess-sc-1qn4ixc-5.VGQNd';

  try {
    await page.goto(`https://twitch.tv/${url}`);
    await page.setViewport({ width: 1920, height: 900 });
    await page.setCookie(...cookies);
    await page.evaluate(() => {
      localStorage.setItem('mature', 'true');
      localStorage.setItem('video-muted', '{"default":true}');
      localStorage.setItem('video-quality', '{"default":"160p30"}');
    });
    
    // Depois de abrir a twitch e injetar o cookie, dá reload
    await load(page, url);

    let peopleWatching = await page.$('.live-time', {visible: true});

    // Verifica se o streamer está on!
    if (peopleWatching !== null) {

      streamersObj[url].live = true;
      console.log(`Parece que ${url} está on! Bora pegar os pontos!`);

      while (peopleWatching !== null) {
        try {
          await page.click(bau);
          await sleep(3000);

          try {
            await page.waitForSelector(bau, { timeout: 10000, visible: true, });
            console.log('O báu ta aqui');
          } catch (error) {
            clicks++;
            timeClick = new Date().toLocaleTimeString();
            console.log(`Peguei o bônus de ${url} as ${timeClick}, essa é a ${clicks} vez que eu pego o báu!`);
          }
  
        } catch (error) { }

        await sleep(10000);
  
        interations++;

        // Verifica se o streamer ainda está on, depois de 15 minutos
        if (interations % 90 === 0) {  
          await load(page, url);  
          peopleWatching = await page.$('.live-time');        
        }        
      }
      
      // Estava on, mas fechou a live
      timeClick = new Date().toLocaleTimeString();
      console.log(`${url} fechou a live as ${timeClick}, vou embora!`);
      streamersObj[url].live = false;

      await page.close();
      await browser.close();
      treekill(browser.process().pid, 'SIGKILL');
      sleep(5000);
      cleanUp(userDataDir);

    } else {
      // Não estava on, portanto só mata o processo e deleta a respectiva pasta
      await page.close();
      await browser.close();
      treekill(browser.process().pid, 'SIGKILL');
      sleep(5000);
      cleanUp(userDataDir);
    }

  } catch (error) {
    console.log(`Algo de errado aconteceu enquanto eu procurava o báu de ${url}, mais tarde tento novamente.`);

    await page.close();
    await browser.close();
    treekill(browser.process().pid, 'SIGKILL');
    sleep(5000);
    cleanUp(userDataDir);
  }
};

const main = async () => {
  try {
    fs.mkdirSync(baseDir);
  } catch (error) {}

  let timeClick = new Date().toLocaleTimeString();
  console.log(`Checando se tem um novo streamer online às ${timeClick}`);

  for (const key of Object.keys(streamersObj)) {
    if (streamersObj[key].live === false) {
      Bot(key);
      await sleep(10000);
    }
  }

  await sleep(10000); // Esperar para todas as lives abrirem e fecharem
  
  let livesOn = 0;
  for (const key of Object.keys(streamersObj)) {
    if (streamersObj[key].live === true) livesOn++;
  }
  
  if (livesOn === 0) {
    console.log('Não tem ninguém online, daqui a pouco eu olho de novo');
  } else if (livesOn === 1){
    console.log(`Estou observando ${livesOn} live.`);  
  } else {
    console.log(`Estou observando ${livesOn} lives.`);
  }

  
  const minToMs = minutos * 60 * 1000;
  setTimeout(main, minToMs);
};

if (fs.existsSync(path.join(baseDir))) {
  fs.rmSync(path.join(baseDir), { recursive: true });
}

main();




