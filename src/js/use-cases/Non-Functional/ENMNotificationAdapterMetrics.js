import http from 'k6/http';
import encoding from 'k6/encoding';
import { check, sleep } from 'k6';
import { errorCounter } from '../../main.js';
import { ENM_NOTIFICATION_ADAPTER_URL, ENM_SIM_URL } from '../../utility/constants.js';
import { describe } from '../../utility/describe.js';
import { open } from 'k6/ws';
import exec from 'k6/execution';
import { customMetrics } from '../../characteristicsTests.js';
import { fancyTimeFormat } from '../../utility/utility.js';

export const METRICS = {
  AVC: {
    events: {
      name: 'enmna.evt.propagated',
      threshold: 10000,
    },
    time: {
      name: 'enmna.evt.propagated.processing.time',
      threshold: 90,
    },
    failures: {
      name: 'enmna.evt.failed.conversion',
      threshold: 0,
    },
  },
};

const TIMEOUT = 30000; // 30sec timout of Notif Adapter metrics to arrive
const DURATION = 1800000; //30min duration of Performance  measurement
const params = {
  timeout: 240000,
};

export function ENMNotificationAdapterMetrics() {
  describe('ENM Notificaton Adapter Actuator metrics ', function () {
    console.log('|--------------------------------------------------------|');
    console.log('| --- Actuator Metrics from ENM NOTIFICATION ADAPTER --- |');
    console.log('|--------------------------------------------------------|');
    let getMetric, value, description, statistic, threshold, status, elapsedMilliseconds, startTime, key;

    for (let metric in METRICS.AVC) {
      startTime = Date.now();
      key = METRICS.AVC[metric].name;
      threshold = METRICS.AVC[metric].threshold;
      getMetric = http.get(ENM_NOTIFICATION_ADAPTER_URL + `actuator/metrics/` + key);
      status = getMetric.status;
      do {
        getMetric = http.get(ENM_NOTIFICATION_ADAPTER_URL + `actuator/metrics/` + key, {
          name: 'Getting actuator metrics from ENMNA',
          threshold,
        });
        status = getMetric.status;
        console.log(`${key} metrics response status is:  ${status} :>> waiting 5 seconds for the metric to arrive...`);
        sleep(5);
        elapsedMilliseconds = Date.now() - startTime;
      } while (status != 200 && elapsedMilliseconds < TIMEOUT);
      try {
        description = JSON.parse(getMetric.body).description;
      } catch (error) {
        console.log('Error while parsing description of Metric:  ' + key + ' Error Message is :>>  ' + error);
      }
      if (description === null) {
        description = key;
      }
      value = JSON.parse(getMetric.body).measurements[0].value;
      statistic = JSON.parse(getMetric.body).measurements[0].statistic;
      console.log(`${key}   :   ${value}`);
      const resmetric = check(getMetric, {
        [`${description}   :   ${value}  ${statistic}`]: () => getMetric.status === 200,
        //[`THRESHOLD for ${description} should be less than:  ${threshold} and VALUE is:  ${value}`]: () => value <= threshold,
      });
      if (!resmetric) {
        //errorCounter.add(1);
      }
    }
  });
}

export function ENMNotificationAdapterPerformance() {
  describe(`ENM Notificaton Adapter performance measurements ${__ITER} `, function () {
    console.log('|---------------------------------------------------------|');
    console.log('| --- ENM Notification Adapter performance measurement ---|');
    console.log('|---------------------------------------------------------|');
    let value,
      sum,
      maxValue,
      stormRateLimit = 300,
      description,
      statistic,
      elapsedMilliseconds,
      getMetric,
      startTime = Date.now(),
      metricKey = METRICS.AVC.time.name,
      threshold = METRICS.AVC.time.threshold,
      processMeasurement = true,
      processedData = {},
      averageValue,
      status;
    do {
      try {
        getMetric = http.get(ENM_NOTIFICATION_ADAPTER_URL + `actuator/metrics/` + metricKey, {
          name: 'Getting actuator metrics from ENMNA',
          threshold,
        });
        status = getMetric.status;
        try {
          value = JSON.parse(getMetric.body).measurements[0].value;
          processedData[Date.now()] = value;
        } catch (error) {
          console.log(`SCENARIO:;${exec.scenario.name} ${__ITER} :>> Error while parsing value of metric ${metricKey}, Error Message is :>> ${error}`);
          value = 0;
        }
      } catch (error) {
        console.log(`SCENARIO:;${exec.scenario.name} ${__ITER} :>> Response wasn't correct :>> ${status}, missing data from ${Date().toString()} `);
        console.log(`SCENARIO:;${exec.scenario.name} ${__ITER} :>> Error message is :>> ${error}`);
      }
      elapsedMilliseconds = Date.now() - startTime;
      console.log(`SCENARIO:;${exec.scenario.name} ${__ITER} :>> ${metricKey} metrics response status is:  ${status}  value is:  ${value} :>> waiting 1 seconds for next value...`);
      sleep(1);
    } while (processMeasurement && DURATION > elapsedMilliseconds && value < stormRateLimit);

    (maxValue = 0), (sum = 0);
    for (let key in processedData) {
      if (processedData[key] > maxValue) {
        maxValue = processedData[key];
      }
      sum += processedData[key];
    }
    averageValue = sum / Object.keys(processedData).length;
    customMetrics[exec.scenario.name].add(averageValue);
    console.log(`SCENARIO:;${exec.scenario.name} ${__ITER} :>> `, 'averageValue :>> ', averageValue);
    console.log(`SCENARIO:;${exec.scenario.name} ${__ITER} :>> `, 'processedData :>> ', processedData);
    try {
      description = JSON.parse(getMetric.body).description;
      statistic = JSON.parse(getMetric.body).measurements[0].statistic;
    } catch (error) {
      console.log(`SCENARIO:;${exec.scenario.name} ${__ITER} :>> Error while parsing description / statistic of ${metricKey} metric`);
      console.log(`SCENARIO:;${exec.scenario.name} ${__ITER} :>> Error message ${error}`);
    }

    console.log('statistic :>> ', statistic);

    description = metricKey;
    const resmetric = check(getMetric, {
      [`Average value for ${description} should be below : ${threshold} and avarage value is: ${averageValue}`]: () => averageValue <= threshold,
      [`Max value for ${description} was : ${maxValue}`]: () => maxValue == maxValue,
    });
    if (!resmetric) {
      //errorCounter.add(1);
    }
  });
}

export function ENMNAStormRatePerformance() {
  let addEventActivityStorm = encoding.b64encode('enm1.addEventActivityStorm("RadioNode",60000,200000)'),
    addEventActivityBase = encoding.b64encode('enm1.addEventActivityStorm("RadioNode",600000,20000)');

  describe('Configuring event activity in ENM Notification Simulator', function () {
    console.log('Setting up ENM Notification Simulator...');
    console.log(`Sending Base-load activity to Notification-Simulator :>> ${encoding.b64decode(addEventActivityBase)}`);
    let addActivityBase = http.get(ENM_SIM_URL + addEventActivityBase, { name: 'Setting up ENM Notification Simulator with addEventActivityBase' });
    try {
      console.log(`addEventActivityBase status :>> ${addActivityBase.status}`);
      console.log(`addActivityBase :>> ${addActivityBase.body}`);
    } catch (error) {
      console.log(`error :>> ${error}`);
    }
    console.log(`Sending Base-load activity to Notification-Simulator :>> ${encoding.b64decode(addEventActivityBase)}`);
    let addActivityStorm = http.get(ENM_SIM_URL + addEventActivityStorm, { name: 'Setting up ENM Notification Simulator with addEventActivityStorm' });
    try {
      console.log(`addEventActivityStorm status :>> ${addActivityStorm.status}`);
      console.log(`addActivity :>> ${addActivityStorm.body}`);
    } catch (error) {
      console.log(`error :>> ${error}`);
    }

    const res = check(addActivityStorm, {
      'Add Event Activity (status: 200)': (r) => addActivityStorm.status === 200,
      'Add Event Activiy response is correct (void)': (r) => addActivityStorm.body.includes('void'),
    });
    if (!res) {
      console.log('addEventActivityStorm status: ' + addActivityStorm.status);
      addActivityStorm.body && console.log('addActivity body: ' + addActivityStorm.body);
      errorCounter.add(1);
    }
  });
  console.log(`Verifying events from addEventActiviy ::> ${encoding.b64decode(addActivityStorm)} ...`);
  describe(`ENM Notificaton Adapter Storm-rate measurements ${__ITER} `, function () {
    console.log(`SCENARIO:;${exec.scenario.name} ${__ITER} :>> |---------------------------------------------------------|`);
    console.log(`SCENARIO:;${exec.scenario.name} ${__ITER} :>> | --- ENM Notification Adapter Storm-rate measurement --- |`);
    console.log(`SCENARIO:;${exec.scenario.name} ${__ITER} :>> |---------------------------------------------------------|`);
    console.log(`SCENARIO:;${exec.scenario.name} ${__ITER} :>> | Polling metric to see when Storm-Rate starts ...        |`);
    let value,
      sum,
      maxValue,
      stormRateLimit = 90,
      description,
      statistic,
      elapsedMilliseconds,
      getMetric,
      startTime = Date.now(),
      metricKey = METRICS.AVC.time.name,
      threshold = METRICS.AVC.time.threshold,
      processMeasurement = true,
      processedData = {},
      averageValue,
      latencyDecreaseTime,
      processEvents = true,
      DmaaPCounter = 0,
      messageCounter = 0,
      status;
    // ---------------------
    // Scenario will start before Storm-rate, and poll metric to check when Storm-rate starts
    // ---------------------
    do {
      try {
        getMetric = http.get(ENM_NOTIFICATION_ADAPTER_URL + `actuator/metrics/` + metricKey, {
          name: 'Getting actuator metrics from ENMNA',
          threshold,
        });
      } catch (error) {
        console.log(`SCENARIO:;${exec.scenario.name} ${__ITER} :>> Response wasn't correct :>> ${status}`);
        console.log(`SCENARIO:;${exec.scenario.name} ${__ITER} :>> Error message is :>> ${error}`);
      }
      status = getMetric.status;
      try {
        value = JSON.parse(getMetric.body).measurements[0].value;
        processedData[Date.now()] = value;
      } catch (error) {
        console.log(`SCENARIO:;${exec.scenario.name} ${__ITER} :>> Error while parsing value of metric ${metricKey}, Error Message is :>> ${error}`);
        value = 0;
      }
      elapsedMilliseconds = Date.now() - startTime;
      sleep(5);
    } while (processMeasurement && DURATION > elapsedMilliseconds && value < stormRateLimit);
    console.log(`processedData through come-up pahse...`);
    console.log(`processedData :>> ${processedData}`);
    console.log(`SCENARIO:;${exec.scenario.name} ${__ITER} :>> ----------------------------------------------------------`);
    console.log(`SCENARIO:;${exec.scenario.name} ${__ITER} :>> --- STORMRATE Limit exceeded , measurement starts now! ---`);
    console.log(`SCENARIO:;${exec.scenario.name} ${__ITER} :>> ----------------------------------------------------------`);
    startTime = Date.now();
    processedData = {};
    do {
      try {
        getMetric = http.get(ENM_NOTIFICATION_ADAPTER_URL + `actuator/metrics/` + metricKey, {
          name: 'Getting actuator metrics from ENMNA',
          threshold,
        });
        status = getMetric.status;
        try {
          value = JSON.parse(getMetric.body).measurements[0].value;
          processedData[Date.now()] = value;
        } catch (error) {
          console.log(`SCENARIO:;${exec.scenario.name} ${__ITER} :>> Error while parsing value of metric ${metricKey}, Error Message is :>> ${error}`);
          value = 0;
        }
      } catch (error) {
        console.log(`SCENARIO:;${exec.scenario.name} ${__ITER} :>> Response wasn't correct :>> ${status}, missing data from ${Date().toString()} `);
        console.log(`SCENARIO:;${exec.scenario.name} ${__ITER} :>> Error message is :>> ${error}`);
      }
      elapsedMilliseconds = Date.now() - startTime;
      console.log(`SCENARIO:;${exec.scenario.name} ${__ITER} :>> ${metricKey} metrics response status is:  ${status}  value is:  ${value} :>> waiting 1 seconds for next value...`);
      sleep(1);
    } while (processMeasurement && DURATION > elapsedMilliseconds && value > stormRateLimit);

    (maxValue = 0), (sum = 0);
    for (let key in processedData) {
      if (processedData[key] > maxValue) {
        maxValue = processedData[key];
      }
      sum += processedData[key];
    }
    latencyDecreaseTime = Object.keys(processedData).pop() - Object.keys(processedData)[maxValue];
    averageValue = sum / Object.keys(processedData).length;
    // customMetrics[exec.scenario.name].add(maxValue);
    console.log(`SCENARIO:;${exec.scenario.name} ${__ITER} :>> `, 'averageValue :>> ', averageValue);
    console.log(`SCENARIO:;${exec.scenario.name} ${__ITER} :>> `, 'processedData :>> ', processedData);
    console.log(`SCENARIO:;${exec.scenario.name} ${__ITER} :>> `, 'latencyDecreaseTime :>> ', latencyDecreaseTime);
    try {
      description = JSON.parse(getMetric.body).description;
      statistic = JSON.parse(getMetric.body).measurements[0].statistic;
    } catch (error) {
      console.log(`SCENARIO:;${exec.scenario.name} ${__ITER} :>> Error while parsing description / statistic of ${metricKey} metric`);
      console.log(`SCENARIO:;${exec.scenario.name} ${__ITER} :>> Error message ${error}`);
    }

    if (description === null) {
      description = metricKey;
    }
    const resmetric = check(getMetric, {
      [`Max value for ${metricKey} was : ${maxValue}`]: () => maxValue == maxValue,
      [`Latency decrease time after Storm-rate's max value was : ${fancyTimeFormat(latencyDecreaseTime)}`]: () => latencyDecreaseTime == latencyDecreaseTime,
    });
    if (!resmetric) {
      //errorCounter.add(1);
    }
  });
}
function updateResultFile(startTime, endTime, counterValues) {
  let result = {
    start_time: startTime,
    end_time: endTime,
    counter_values: counterValues,
  };

  // Save the result to a JSON file
  let fileName = `result_${startTime}.json`;
  let file = open(fileName, 'w');
  file.write(JSON.stringify(result, null, 2));
  file.close();
}
