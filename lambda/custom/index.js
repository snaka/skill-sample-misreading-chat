/* eslint-disable  func-names */
/* eslint-disable  no-console */
const request = require('request')
const FeedParser = require('feedparser')

const PODCAST_FEED_URL = 'https://misreading.chat/category/episodes/feed/'
const PODCAST_NAME = 'ミスリーディングチャット'

function pickSslMediaUrl (enclosures) {
  const sslMedia = enclosures.find(item => item.url.startsWith('https'))
  if (sslMedia) return sslMedia.url

  const nonSslMedia = enclosures[0]
  // Alexa Skill の AudioPlayer は https: で提供されるURLしか対応していないため強引に書き換える
  if (nonSslMedia) return nonSslMedia.url.replace(/^http:/, 'https:')

  throw new Error('Media not found.')
}

function getLatestEpisode () {
  return new Promise(async (resolve, reject) => {
    const feedparser = new FeedParser()

    request.get(PODCAST_FEED_URL).pipe(feedparser)

    feedparser.on('data', (data) => {
      const audioUrl = pickSslMediaUrl(data.enclosures)
      resolve({
        title: data.title,
        url: audioUrl,
        published_at: data.pubDate.toISOString()
      })
    })
  })
}

async function playPodcast (handlerInput) {
  const latestEpisode = await getLatestEpisode()
    const speechText = `${PODCAST_NAME} の最新エピソード ${latestEpisode.title} を再生します`;

    return handlerInput.responseBuilder
      .speak(speechText)
      .withSimpleCard(PODCAST_NAME, speechText)
      .addAudioPlayerPlayDirective('REPLACE_ALL', latestEpisode.url, latestEpisode.url, 0)
      .getResponse();
}

const Alexa = require('ask-sdk-core');

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  async handle(handlerInput) {
    return await playPodcast(handlerInput)
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak('ごめんなさい、よくわかりません')
      .reprompt('ごめんなさい、よくわかりません')
      .getResponse();
  },
};

const skillBuilder = Alexa.SkillBuilders.custom();

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
