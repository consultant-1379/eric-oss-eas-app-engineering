import * as kafka from 'k6/x/kafka';

const BROKER = [`${__ENV.KAFKA_BOOTSTRAP_SERVER_HOST}:${__ENV.KAFKA_BOOTSTRAP_SERVER_PORT}`];
const K6_CONSUMER_GROUP = 'k6-group';
const second = 1000000000;
let consumer;

export const readEvents = (maxWaitMilliSec, amountOfEvents, TOPIC, reset) => {
  if (__ENV.KAFKA_TLS_ENABLED === 'true') {
    const tlsConfig = {
      enableTls: true,
      insecureSkipTlsVerify: false,
      minVersion: kafka.TLS_1_2,
      clientCertPem: '/certs/kafka-cert/tls.crt',
      clientKeyPem: '/certs/kafka-cert/tls.key',
      serverCaPem: '/certs/eric-sec-sip-tls-trusted-root-cert/ca.crt',
    };
    consumer = kafka.Reader({
      BROKERs: BROKER,
      groupId: K6_CONSUMER_GROUP,
      groupTopics: [TOPIC],
      tls: tlsConfig,
      maxWait: '5s',
      connectLogger: false,
    });
  } else {
    consumer = kafka.Reader({
      BROKERs: BROKER,
      groupId: K6_CONSUMER_GROUP,
      groupTopics: [TOPIC],
      maxWait: '5s',
      connectLogger: false,
    });
  }
  let startTime = Date.now();
  let allMessages = [];
  let decodedEvents = [];
  let eventNumber = 1;
  while (Date.now() - startTime < maxWaitMilliSec) {
    let messages = '';
    messages = consumer.consume({ limit: amountOfEvents });
    console.log('Messages length after consumption: ' + messages.length);
    allMessages.push(messages);
    messages.forEach((m) => {
      let decodedMessage = decodeMessage(m);
      if (decodedMessage.key !== '' && decodedMessage.value !== '') {
        if (!reset) {
          console.log(`${eventNumber++} Pushed Event: ${JSON.stringify(decodedMessage)}`);
        }
        decodedEvents.push(decodedMessage);
      }
    });
    console.log('Decoded messages length after consumption: ' + decodedEvents.length);
    if (decodedEvents.length == amountOfEvents) {
      break;
    }
  }

  consumer.close();
  return decodedEvents;
};

function decodeMessage(messageString) {
  if (messageString.key && Array.isArray(messageString.key)) {
    messageString.key = String.fromCharCode(...messageString.key.filter((code) => code >= 32));
  }

  if (messageString.value && Array.isArray(messageString.value)) {
    messageString.value = String.fromCharCode(...messageString.value.filter((code) => code >= 32));
  }

  return messageString;
}
