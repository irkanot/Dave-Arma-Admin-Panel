for (const environmentVariable of ['GAME_TYPE', 'GAME_PATH']) {
  if (!process.env[environmentVariable]) {
    console.log('Missing required environment variable "' + environmentVariable + '"')
    process.exit(1)
  }
}

module.exports = {
  game: process.env.GAME_TYPE,
  path: process.env.GAME_PATH,
  port: process.env.PORT || 3000,
  host: process.env.HOST || '0.0.0.0',
  type: 'linux',
  additionalConfigurationOptions: process.env.SERVER_ADDITIONAL_CONFIG,
  parameters: (process.env.SERVER_PARAMETERS || '').split(','),
  serverMods: (process.env.SERVER_MODS || '').split(','),
  admins: (process.env.SERVER_ADMINS || '').split(','),
  security: {
    enabled: true,
    usersFilePath: process.env.USERS_FILE || 'users.json',
    users: []
  },
  audit: {
    filePath: process.env.AUDIT_FILE || 'audit.json'
  },
  steamAuth: {
    enabled: true,
    baseUrl: process.env.STEAM_AUTH_BASE_URL || 'http://localhost:3000',
    sessionSecret: process.env.SESSION_SECRET || 'change-me',
    apiKey: process.env.STEAM_API_KEY || ''
  },
  prefix: process.env.SERVER_PREFIX,
  suffix: process.env.SERVER_SUFFIX,
  logFormat: process.env.LOG_FORMAT || 'dev',
  settingsFilePath: process.env.SETTINGS_FILE || 'settings.json'
}
