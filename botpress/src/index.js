const {
  contentElements,
  contentRenderers,
  actions: builtinActions,
  setup: setupBuiltins
} = require('@botpress/builtins')

const registerCustom = require('./custom')

module.exports = async bp => {
  // This bot template includes a couple of built-in elements and actions
  // Please see the "@botpress/builtins" package to know more
  await registerBuiltin(bp)

  // Register custom actions, elements and renderers
  await registerCustom(bp)

  // Train the NLU model if using the Native NLU Engine
  if (bp.nlu && bp.nlu.provider && bp.nlu.provider.name === 'native') {
    await bp.nlu.provider.sync()
  }

  const webchat = {
    botName: 'Sharon',
    botAvatarUrl: null, // You can provide a URL here
    botConvoTitle: 'SmaHRty',
    botConvoDescription: "High Performance. Delivered.",
    backgroundColor: '#ffffff',
    textColorOnBackground: '#666666',
    foregroundColor: '#000000',
    textColorOnForeground: '#ffffff'
  }

  bp.createShortlink('chat', '/lite', {
    m: 'channel-web',
    v: 'fullscreen',
    options: JSON.stringify({ config: webchat })
  })

  bp.logger.info(`------------`)
  bp.logger.info(`Webchat available at ${bp.botfile.botUrl}/s/chat`)
  bp.logger.info(`------------`)

  ////////////////////////////
  /// Conversation Management
  ////////////////////////////
  //Greeting
  bp.hear({ type: 'visit' }, event => {
    event.reply('#builtin_text', {
      text: `Nice to meet you! I'm Sharon, here to assist you on leave matters. I'm a new member of E-HR, still learning hard so please be kind.`
    }),
      event.reply('#builtin_text', {
        text: `Here are the services I provide at the moment, apply leave, check leave and update leave.`
      })
  })
  // All events that should be processed by the Flow Manager
  bp.hear({ type: /bp_dialog_timeout|text|message|quick_reply/i }, (event, next) => {
    bp.dialogEngine.processMessage(event.sessionId || event.user.id, event).then()
  })
}

async function registerBuiltin(bp) {
  await setupBuiltins(bp)

  // Register all the built-in content elements
  // Such as Carousel, Text, Choice etc..
  for (const schema of Object.values(contentElements)) {
    await bp.contentManager.loadCategoryFromSchema(schema)
  }

  await bp.contentManager.recomputeCategoriesMetadata()

  // Register all the renderers for the built-in elements
  for (const renderer of Object.keys(contentRenderers)) {
    bp.renderers.register(renderer, contentRenderers[renderer])
  }

  // Register all the built-in actions
  bp.dialogEngine.registerActions(builtinActions)
}