# Installazione rapida su un nuovo server Windows

Questo pacchetto e pensato per essere installato con pochi comandi.

Include gia:

- installer Node.js Windows x64;
- SteamCMD ZIP ufficiale;
- dipendenze `node_modules`;
- asset frontend gia buildati;
- script PowerShell di installazione;
- documentazione e test.

Non include dati locali del server di sviluppo:

- `config.js`
- `settings.json`
- `servers.json`
- `users.json`
- `roles.json`
- `jobs.json`
- `audit.json`
- log
- credenziali

## Installazione guidata consigliata

1. Estrai lo ZIP in una cartella stabile, per esempio:

   ```powershell
   C:\arma-server-web-admin
   ```

2. Fai doppio clic su **`INSTALLA.bat`** e conferma la richiesta di amministratore.

3. L'installazione chiede direttamente:

- la cartella di Arma 3 Server (viene verificata la presenza di `arma3server_x64.exe`);
- se usare l'eseguibile Arma 3 Server x64 o x86, verificando che quello scelto esista;
- la cartella in cui installare o trovare SteamCMD (predefinita `C:\SteamCMD`);
- la porta del pannello web;
- l'URL usato per aprire il pannello e per il callback Steam;
- apertura della porta nel Windows Firewall;
- installazione automatica come servizio Windows.

Non e necessario modificare manualmente `config.js` o conoscere i parametri PowerShell.

In alternativa, da PowerShell amministratore:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-windows.ps1
```

Lo script:

- installa Node.js dal MSI incluso se manca;
- installa SteamCMD in `C:\SteamCMD` se manca;
- esegue il primo self-update di SteamCMD;
- genera `config.js`;
- genera `settings.json` con gli stessi percorsi, così i valori sono visibili nella pagina Settings;
- genera i file runtime iniziali;
- usa `node_modules` e `assets` inclusi nel pacchetto;
- valida i percorsi scelti prima di creare la configurazione;
- abilita Steam OpenID come unico metodo di accesso;
- assegna automaticamente il ruolo admin al primo SteamID che completa il login.

Il setup può essere rilanciato per correggere i valori. In quel caso aggiorna davvero
`config.js`, `settings.json` e l'account amministratore, creando prima file `.bak`
della configurazione precedente.

## Comando completo con opzioni utili

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-windows.ps1 `
  -ArmaPath "C:\Arma 3\Arma 3 server tool" `
  -SteamCmdInstallPath "C:\SteamCMD" `
  -HostAddress "0.0.0.0" `
  -Port 3000 `
  -SteamBaseUrl "http://IP-DEL-SERVER:3000" `
  -OpenFirewall
```

Per un'installazione automatica senza domande aggiungi `-NonInteractive`; in questo
caso `-ArmaPath` e obbligatorio. Se ometti `-SteamBaseUrl`, viene usato
`http://localhost:<porta>`.

Per installarlo direttamente come servizio Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-windows.ps1 `
  -ArmaPath "C:\Arma 3\Arma 3 server tool" `
  -SteamBaseUrl "http://IP-DEL-SERVER:3000" `
  -OpenFirewall `
  -InstallService
```

## Avvio

Se non lo hai installato come servizio:

```powershell
npm start
```

Apri:

```text
http://IP_DEL_SERVER:3000
```

Accedi con le credenziali admin stampate dallo script.

## Servizio Windows

Installare il servizio dopo il setup:

```powershell
npm run install-windows-service
```

Rimuovere il servizio:

```powershell
npm run uninstall-windows-service
```

## Percorsi predefiniti

- SteamCMD: `C:\SteamCMD`
- Porta web: `3000`
- Host bind: `0.0.0.0`
- Game: `arma3_x64`
- Type: `windows`

Lo script prova ad autodetectare Arma Server in questi percorsi:

- `C:\Arma3Server`
- `C:\Arma 3 Server`
- `C:\Arma 3\Arma 3 server tool`
- `C:\Program Files (x86)\Steam\steamapps\common\Arma 3 Server`
- `C:\Program Files\Steam\steamapps\common\Arma 3 Server`

Se non lo trova, usa `-ArmaPath`.

## Configurazione iniziale nel pannello

Dal pannello vai in **Admin -> Settings** e controlla:

- Game: `arma3_x64`
- Path: cartella Arma 3 Server
- Type: `windows`
- Dashboard login: `Steam OpenID only`
- Steam base URL: URL usato dai browser per aprire il pannello
- SteamCMD path: `C:\SteamCMD`
- Steam username/password: account usato da SteamCMD

Poi vai in **Admin**:

- crea o modifica utenti;
- associa lo SteamID64;
- assegna ruoli/gruppi;
- usa ownership dei server se piu persone gestiscono istanze diverse.

Non esistono username o password locali per il pannello. Il primo account Steam
che effettua l'accesso dopo una nuova installazione riceve il ruolo `admin`.

## Import mod da FAST HTML

1. Vai in **Admin -> Settings**.
2. Inserisci credenziali SteamCMD.
3. Clicca **Login SteamCMD**.
4. Se Steam Guard lo chiede, approva da mobile o inserisci il codice e ripeti login.
5. Vai in **Mods**.
6. Importa il preset HTML esportato da FAST.
7. Segui lo stato da **Jobs**.

Le mod vengono scaricate con SteamCMD e deployate nella cartella Arma come
cartelle `@...`.

## Missioni

Il download missioni da Steam Workshop legacy e stato rimosso. Usa:

- upload `.pbo`;
- upload `.zip` contenente uno o piu `.pbo`.

## Verifica

```powershell
npm run check
npm audit --audit-level=moderate
```

Stato atteso:

- test verdi;
- build Webpack completata;
- smoke test Playwright completato;
- 0 vulnerabilita npm moderate o superiori.

## Aggiornamento

Dal pannello Admin puoi verificare e installare la release stabile pubblicata su
GitHub. Il feed predefinito e:
`https://github.com/irkanot/Dave-Arma-Admin-Panel/releases/latest/download/latest.json`.

Per l'aggiornamento manuale:

1. Ferma il servizio o il processo `npm start`.
2. Fai backup dei file runtime locali.
3. Estrai la nuova versione sopra la vecchia, senza sovrascrivere i file runtime.
4. Avvia:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\scripts\install-windows.ps1
   ```

5. Riavvia il servizio o `npm start`.
