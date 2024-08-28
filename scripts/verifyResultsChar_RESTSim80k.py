#
# COPYRIGHT Ericsson 2022
#
#
#
# The copyright to the computer program(s) herein is the property of
#
# Ericsson Inc. The programs may be used and/or copied only with written
#
# permission from Ericsson Inc. or in accordance with the terms and
#
# conditions stipulated in the agreement/contract under which the
#
# program(s) have been supplied.
#

import json
import sys
import os
import re

tests = sys.argv[1]

result_json = {
    "discovery": {},
    "base_crud": {},
    "batch": {},
    "vu10crud" :{},
    "sharedcnf_crud" : {},
    "AVC_events" : {}
}

topologyTypes = [
                 "gnbduTopology",
                 "nrcellTopology",
                 "nrsectorcarrierTopology",
                 "gnbcucpTopology",
                 "gnbcuupTopology",
                 "enodebTopology",
                 "ltecellTopology"]

operations = ["create",
              "read",
              "update",
              "delete"]


def find_threshold(data, pattern):
    for key, value in data.items():
        if pattern.match(key):
            return key, value['ok']
    return None, None

def discoveryEvaluate():
    testResultFile = 'restsim-80k-discovery-summary.json'
    print("Checking test result file: " + testResultFile + " for discovery")
    try:
        with open(testResultFile, 'r') as f:
            input_json = json.load(f)
    except IOError:
        print("Could not open file:", testResultFile)
        return
    result_json['discovery']['checks'] = input_json['metrics']['checks']
    result_json['discovery']['http_req_failed'] = input_json['metrics']['http_req_failed']


def vu10Evaluate():
    sum_op_per_secs = []
    for operation in operations:
        result_avg = 0
        result_ops = []
        result_ops_avgs = {}
        sum_op_per_sec = {}
        testResultFile = 'restsim-80k-crud-10-vus-summary.json'
        print("Checking test result file: " + testResultFile + " for " + operation)
        try:
            with open(testResultFile, 'r') as f:
                input_json = json.load(f)
                result_avg = result_avg + input_json['metrics'][operation + 'Op']['values']['avg']
                result_ops.append(input_json['metrics'][operation + 'Op'])

        except IOError:
            print("Could not open file:", testResultFile)
            continue

        sum_op_per_sec[operation] = input_json['metrics'][operation + 'Op']['values']['count'] / 600
        sum_op_per_secs.append(sum_op_per_sec)
        result_json['vu10crud']['sum_op_per_sec'] = sum_op_per_secs
        result_json['vu10crud'][operation] = result_ops
    result_json['vu10crud']['checks'] = input_json['metrics']['checks']
    result_json['vu10crud']['http_req_failed'] = input_json['metrics']['http_req_failed']


def batchEvaluate():
    testResultFile = 'restsim-80k-batch-summary.json'
    print("Checking test result file: " + testResultFile + ' for batch')
    try:
        with open(testResultFile, 'r') as f:
            input_json = json.load(f)
    except IOError:
        print("Could not open file:", testResultFile)
        return

    pattern = re.compile(r'avg [<>]= \d+')

    batchresult = {
        'kafka_consuming_time': {
            'value': input_json['metrics']['kafka_propagation_time_in_seconds']['values']['avg'],
            'threshold': None,
            'threshold_value': None
        },
        'time_between_first_request_and_event': {
            'value': input_json['metrics']['time_between_first_request_and_event']['values']['avg'],
            'threshold': None,
            'threshold_value': None
        },
        'good_statusCode_percentage': {
            'value': round(input_json['metrics']['good_statusCode_percentage']['values']['avg'], 2),
            'threshold': None,
            'threshold_value': None
        }
    }

    threshold_key, threshold_ok = find_threshold(input_json['metrics']['kafka_propagation_time_in_seconds']['thresholds'], pattern)
    batchresult['kafka_consuming_time']['threshold'] = threshold_ok
    batchresult['kafka_consuming_time']['threshold_value'] = threshold_key

    threshold_key, threshold_ok = find_threshold(input_json['metrics']['time_between_first_request_and_event']['thresholds'], pattern)
    batchresult['time_between_first_request_and_event']['threshold'] = threshold_ok
    batchresult['time_between_first_request_and_event']['threshold_value'] = threshold_key

    threshold_key, threshold_ok = find_threshold(input_json['metrics']['good_statusCode_percentage']['thresholds'], pattern)
    batchresult['good_statusCode_percentage']['threshold'] = threshold_ok
    batchresult['good_statusCode_percentage']['threshold_value'] = threshold_key

    result_json['batch'] = batchresult
    result_json['batch']['checks'] = input_json['metrics']['checks']
    result_json['batch']['http_req_failed'] = input_json['metrics']['http_req_failed']


def base_crudEvaluate():
    sum_op_per_secs = []
    for operation in operations:
        result_avg = 0
        result_ops = []
        result_ops_avgs = {}
        sum_op_per_sec = {}
        testResultFile = 'restsim-80k-crud-base-summary.json'
        print("Checking test result file: " + testResultFile + " for " + operation)
        try:
            with open(testResultFile, 'r') as f:
                input_json = json.load(f)
                result_avg = result_avg + input_json['metrics'][operation + 'Op']['values']['avg']
                result_ops.append(input_json['metrics'][operation + 'Op'])

        except IOError:
            print("Could not open file:", testResultFile)
            continue

        sum_op_per_sec[operation] = input_json['metrics'][operation + 'Op']['values']['count'] / 600
        sum_op_per_secs.append(sum_op_per_sec)
        result_json['base_crud']['sum_op_per_sec'] = sum_op_per_secs
        result_json['base_crud'][operation] = result_ops
    print("Checking test result file: " + testResultFile + ' for batch')
    pattern = re.compile(r'avg [<>]= \d+')

    batchresult = {
        'kafka_consuming_time': {
            'value': input_json['metrics']['kafka_propagation_time_in_seconds']['values']['avg'],
            'threshold': None,
            'threshold_value': None
        },
        'time_between_first_request_and_event': {
            'value': input_json['metrics']['time_between_first_request_and_event']['values']['avg'],
            'threshold': None,
            'threshold_value': None
        },
        'good_statusCode_percentage': {
            'value': round(input_json['metrics']['good_statusCode_percentage']['values']['avg'], 2),
            'threshold': None,
            'threshold_value': None
        }
    }

    threshold_key, threshold_ok = find_threshold(input_json['metrics']['kafka_propagation_time_in_seconds']['thresholds'], pattern)
    batchresult['kafka_consuming_time']['threshold'] = threshold_ok
    batchresult['kafka_consuming_time']['threshold_value'] = threshold_key

    threshold_key, threshold_ok = find_threshold(input_json['metrics']['time_between_first_request_and_event']['thresholds'], pattern)
    batchresult['time_between_first_request_and_event']['threshold'] = threshold_ok
    batchresult['time_between_first_request_and_event']['threshold_value'] = threshold_key

    threshold_key, threshold_ok = find_threshold(input_json['metrics']['good_statusCode_percentage']['thresholds'], pattern)
    batchresult['good_statusCode_percentage']['threshold'] = threshold_ok
    batchresult['good_statusCode_percentage']['threshold_value'] = threshold_key

    result_json['base_crud']['batch'] = batchresult
    result_json['base_crud']['checks'] = input_json['metrics']['checks']
    result_json['base_crud']['http_req_failed'] = input_json['metrics']['http_req_failed']


def sharedcnfEvaluate():
    sum_op_per_secs = []
    for operation in operations:
        result_avg = 0
        result_ops = []
        result_ops_avgs = {}
        sum_op_per_sec = {}
        testResultFile = 'sharedcnf-crud-summary.json'
        print("Checking test result file: " + testResultFile + " for " + operation)
        try:
            with open(testResultFile, 'r') as f:
                input_json = json.load(f)
                result_avg = result_avg + input_json['metrics'][operation + 'OpSharedCNF']['values']['avg']
                result_ops.append(input_json['metrics'][operation + 'OpSharedCNF'])

        except IOError:
            print("Could not open file:", testResultFile)
            continue

        sum_op_per_sec[operation] = input_json['metrics'][operation + 'OpSharedCNF']['values']['count'] / 600
        sum_op_per_secs.append(sum_op_per_sec)
        result_json['sharedcnf_crud']['sum_op_per_sec'] = sum_op_per_secs
        result_json['sharedcnf_crud'][operation] = result_ops
    result_json['sharedcnf_crud']['checks'] = input_json['metrics']['checks']
    result_json['sharedcnf_crud']['http_req_failed'] = input_json['metrics']['http_req_failed']


def avceventsEvaluate():
    testResultFile = 'restsim-80k-avc-summary.json'
    print("Checking test result file: " + testResultFile + " for AVC events")
    try:
        with open(testResultFile, 'r') as f:
            input_json = json.load(f)
    except IOError:
        print("Could not open file:", testResultFile)
        return
    result_json['AVC_events']['checks'] = input_json['metrics']['checks']
    result_json['AVC_events']['http_req_failed'] = input_json['metrics']['http_req_failed']


def writeResult():
    string_json = json.dumps(result_json, indent=2)
    with open("char_results.json", "w") as outfile:
        outfile.write(string_json)


def evaluateResult():
    print('Checking test result file: char_results.json for result evaluation')
    failTest = False
    emptyResults = False
    try:
        with open('char_results.json', 'r') as f:
            input_json = json.load(f)
    except IOError:
        print("Could not open file:", f)
        sys.exit(errno.EACCES)

    discovery_results = input_json.get('discovery', {})
    base_crud_results = input_json.get('base_crud', {})
    vu10crud_results = input_json.get('vu10crud', {})
    batch_results = input_json.get('batch', {})
    sharedcnf_crud_results = input_json.get('sharedcnf_crud', {})
    AVC_events_results = input_json.get('AVC_events', {})

    # Check discovery results
    if 'checks' in discovery_results:
        if discovery_results['checks'].get('values', {}).get('fails', 0) != 0:
            print("Discovery test failed")
            failTest = True

    # Check base CRUD results
    for operation in operations:
        if operation in base_crud_results:
            for result in base_crud_results[operation]:
                thresholds = result.get('thresholds', {})
                for threshold_key, threshold_value in thresholds.items():
                    if not threshold_value.get('ok', False):
                        print("Base CRUD test failed for", operation)
                        failTest = True
                        break
                else:
                    continue
                break

    # Check VU10 CRUD results
    for operation in operations:
        if operation in vu10crud_results:
            for result in vu10crud_results[operation]:
                thresholds = result.get('thresholds', {})
                for threshold_key, threshold_value in thresholds.items():
                    if not threshold_value.get('ok', False):
                        print("VU10 CRUD test failed for", operation)
                        failTest = True
                        break
                else:
                    continue
                break

    # Check batch results
    if 'kafka_consuming_time' in batch_results:
        if not batch_results['kafka_consuming_time'].get('threshold', False):
            print("Batch test failed for kafka_consuming_time")
            failTest = True
    if 'time_between_first_request_and_event' in batch_results:
        if not batch_results['time_between_first_request_and_event'].get('threshold', False):
            print("Batch test failed for time_between_first_request_and_event")
            failTest = True
    if 'good_statusCode_percentage' in batch_results:
        if not batch_results['good_statusCode_percentage'].get('threshold', False):
            print("Batch test failed for good_statusCode_percentage")
            failTest = True

    # Check sharedcnf CRUD results
    for operation in operations:
        if operation in sharedcnf_crud_results:
            for result in sharedcnf_crud_results[operation]:
                thresholds = result.get('thresholds', {})
                for threshold_key, threshold_value in thresholds.items():
                    if not threshold_value.get('ok', False):
                        print("Sharedcnf CRUD test failed for", operation)
                        failTest = True
                        break
                else:
                    continue
                break

    # Check if any fails in checks for base CRUD
    if base_crud_results and base_crud_results.get('checks', {}).get('values', {}).get('fails', 0) != 0:
        print("Base CRUD test failed due to failed checks")
        failTest = True

    # Check if any fails in checks for VU10 CRUD
    if vu10crud_results and vu10crud_results.get('checks', {}).get('values', {}).get('fails', 0) != 0:
        print("VU10 CRUD test failed due to failed checks")
        failTest = True

    # Check if any fails in checks for batch
    if batch_results and batch_results.get('checks', {}).get('values', {}).get('fails', 0) != 0:
        print("Batch test failed due to failed checks")
        failTest = True

    # Check if any fails in checks for SharedCNF CRUD
    if sharedcnf_crud_results and sharedcnf_crud_results.get('checks', {}).get('values', {}).get('fails', 0) != 0:
        print("Sharedcnf CRUD test failed due to failed checks")
        failTest = True

    # Check if any fails in checks for AVC events
    if AVC_events_results and AVC_events_results.get('checks', {}).get('values', {}).get('fails', 0) != 0:
        print("AVC events test failed due to failed checks")
        failTest = True

    if failTest:
        print("There are failed thresholds!")
        sys.exit(1)
    else:
        print("All thresholds passed.")
        sys.exit(os.EX_OK)


if "discovery" in tests:
    discoveryEvaluate()

if "crud" in tests:
    vu10Evaluate()
    batchEvaluate()
    base_crudEvaluate()
    sharedcnfEvaluate()

if "events" in tests:
    avceventsEvaluate()


writeResult()
evaluateResult()

sys.exit(os.EX_OK)
