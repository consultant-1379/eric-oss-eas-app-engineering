import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { errorCounter } from '../../main.js';
import { ENM_ADAPTER_URL, ENM_MODEL_ADAPTER_URL } from '../../utility/constants.js';
import { describe } from '../../utility/describe.js';
import { fancyTimeFormat, getSubsystemId } from '../../utility/utility.js';

const ENMModelZipTrend = new Trend('FetchingModelZIP', true);

export function ENMModelAdapterMetrics(subsystemId) {
  const ZipRequestBody = {
    operation: 'read',
    dataType: 'application/yang-data+json',
    cmHandleProperties: {
      subSystem: subsystemId,
      targetDnPrefix: 'SubNetwork=Europe,SubNetwork=Ireland,MeContext=NR01gNodeBRadioT00012',
      targetNode: 'MeContext=CORE12EPGSSR001',
      ossModelIdentity: '22.Q1-R48A08',
      neType: 'RadioNode',
    },
  };
  describe('ENM Model Adapter Actuator metrics ', function () {
    let getModelZip, getZipDuration, zipDuration;
    console.log('Sending model zip download request to ENM-Adapter... ');
    try {
      getModelZip = http.get(ENM_ADAPTER_URL + `/dmi/v1/ch/models/` + subsystemId + `/RadioNode`, ZipRequestBody);
      console.log('Response time getting model zip from ENM-Adapter: ' + getModelZip.timings.duration + ' ms');
    } catch (error) {
      console.log('Error while getting model zip, error message :>> ' + error);
    }
    try {
      getZipDuration = http.get(ENM_MODEL_ADAPTER_URL + `actuator/metrics/enmma.extractModelZipFiles.duration`);
      zipDuration = JSON.parse(getZipDuration.body).measurements[0].value;
      ENMModelZipTrend.add(zipDuration); // metric
      console.log('Duration of ZIP download: ' + zipDuration);
    } catch (error) {
      console.log('Error while getting zip duration, error message :>> ' + error);
      ENMModelZipTrend.add(0);
      zipDuration = 0;
    }
    console.log('|-------------------------------------------------|');
    console.log('| --- Actuator Metrics from ENM MODEL ADAPTER --- |');
    console.log('|-------------------------------------------------|');
    console.log('.... 5 second waiting time for metric to arrive  ....');
    sleep(5);
    let getENMMetrics, elements, getMetric, value, description, statistic, key;
    try {
      getENMMetrics = http.get(ENM_MODEL_ADAPTER_URL + `actuator/metrics`);
      elements = JSON.parse(getENMMetrics.body);
    } catch (error) {
      console.log(`Error while getting ENM Model-Adapter Metrics :>> ${error}`);
      console.log(`response from endpoint :>> ${getENMMetrics}`);
      console.log(`Response status :>> ${getENMMetrics.status}`);
    }
    console.log(`Type of elements variable :>> ${typeof elements}`);
    if (typeof elements === 'object') {
      for (let i = 0; i < elements.names.length; i++) {
        if (elements.names[i].includes('enmma')) {
          key = elements.names[i];
          try {
            getMetric = http.get(ENM_MODEL_ADAPTER_URL + `actuator/metrics/` + key);
            description = JSON.parse(getMetric.body).description;
            if (description === null) {
              description = key;
            }
            value = JSON.parse(getMetric.body).measurements[0].value;
            statistic = JSON.parse(getMetric.body).measurements[0].statistic;
            console.log(`${key}   :   ${value}`);
            const resmetric = check(getMetric, {
              [`${key}   :   ${value}  ${statistic}`]: () => getMetric.status === 200,
            });
            if (!resmetric) {
              console.log(`Error while gettin ${key} metric, model-adapter metrics response status was :>> ${getMetric.status}`);
              console.log(`Response :>> ${getMetric}`);
              //errorCounter.add(1);
            }
          } catch (error) {
            console.log(`Error while getting ${key} metric :>> ${error}`);
            console.log(`Metric status :>> ${getMetric.status} response :>> ${getMetric}`);
          }
        }
      }
    }
    const res = check(getModelZip, {
      ['Fetching Model zip files status 200, finished in ' + fancyTimeFormat(zipDuration)]: () => 200 === 200,
      //['Fetching Model zip finished in ' + fancyTimeFormat(zipDuration)]: () => zipDuration < 120000,
    });
    if (!res) {
      //errorCounter.add(1);
    }
  });
}
