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

testType = sys.argv[1]
tests = sys.argv[2]

result_json = {
    "discovery": {},
    "crud": {},
    "deregistration": {}
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


def topologyDiscoveryEvaluate():
    testResultFile = testType + '-discovery-' + 'summary.json'
    print("Checking test result file: " + testResultFile + ' for topology discovery')
    try:
        with open(testResultFile, 'r') as f:
            input_json = json.load(f)
    except IOError:
        print("Could not open file:", testResultFile)
        return

    for topology in topologyTypes:
        topologyResult = {}
        topologyResult['timeTaken'] = input_json['metrics'][topology + 'Discovery']['values']['count']
        topologyResult['thresholds'] = input_json['metrics'][topology + 'Discovery']['thresholds']

        result_json['discovery'][topology + 'Discovery'] = topologyResult


def crudEvaluate():

    averages = []
    for operation in operations:
        number_of_files = 0
        result_avg = 0
        num_of_vus = 0
        result_ops = []
        result_ops_avgs = {}
        op_avg_result = {}
        for i in range(3):
            testResultFile = 'crud-' + str(i+1) + '-' + 'summary.json'
            #testResultFile = operation + '-' + str(i+1) + '-' + 'summary.json'
            print("Checking test result file: " + testResultFile + " for " + operation + "-" + str(i+1))
            try:
                with open(testResultFile, 'r') as f:
                    input_json = json.load(f)
                    num_of_vus = input_json['metrics']['vus_max']['values']['value']
                    result_avg = result_avg + input_json['metrics'][operation + 'OperationSuccessful']['values']['avg']
                    result_ops.append(input_json['metrics'][operation + 'OperationSuccessful'])
                    number_of_files = number_of_files + 1

            except IOError:
                print("Could not open file:", testResultFile)
                continue
        result_json['crud'][operation] = result_ops

        result_ops_avgs['sec_per_op'] = (result_avg / 1000) / number_of_files
        result_ops_avgs['op_per_sec'] = 1 / ((result_avg / 1000) / number_of_files)
        result_ops_avgs['sum_op_per_sec'] = num_of_vus * (1 / ((result_avg / 1000) / number_of_files))
        op_avg_result[operation] = result_ops_avgs
        averages.append(op_avg_result)
        result_json['crud']['averages'] = averages


def topologyDeregistrationEvaluate():
    testResultFile = testType + '-deregistration-' + 'summary.json'
    print("Checking test result file: " + testResultFile + ' for topology deregistration')
    try:
        with open(testResultFile, 'r') as f:
            input_json = json.load(f)
    except IOError:
        print("Could not open file:", testResultFile)
        return  

    for topology in topologyTypes:
        topologyResult = {}
        topologyResult['timeTaken'] = input_json['metrics'][topology + 'Deregistration']['values']['count']
        topologyResult['thresholds'] = input_json['metrics'][topology + 'Deregistration']['thresholds']

        result_json['deregistration'][topology + 'Deregistration'] = topologyResult


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

    discovery_results = input_json['discovery']
    crud_results = input_json['crud']
    deregistration_results = input_json['deregistration']

    if "discovery" in tests:
        if len(discovery_results) == 0:
            print("Discovery results are empty, skiping evaluation")
            emptyResults = True
        if not emptyResults:
            for topology in topologyTypes:
                for key in discovery_results[topology + 'Discovery']['thresholds'].keys():
                    if not discovery_results[topology + 'Discovery']['thresholds'][key]['ok']:
                        print('Threshold ' + key + ' failed for ' + topology + 'Discovery')
                        failTest = True

    if "crud" in tests:
        if len(crud_results) == 0:
            print("CRUD results are empty, skiping evaluation")
            emptyResults = True
        if not emptyResults:
            for operation in operations:
                for result in crud_results[operation]:
                    for key in result['thresholds'].keys():
                        if not result['thresholds'][key]['ok']:
                            print('Threshold ' + key + ' failed for ' + operation)
                            failTest = True

    if "deregistration" in tests:
        if len(deregistration_results) == 0:
            print("Deregistration results are empty, skiping evaluation")
            emptyResults = True
        if not emptyResults:
            for topology in topologyTypes:
                for key in deregistration_results[topology + 'Deregistration']['thresholds'].keys():
                    if not deregistration_results[topology + 'Deregistration']['thresholds'][key]['ok']:
                        print('Threshold ' + key + ' failed for ' + topology + 'Deregistration')
                        failTest = True

    if failTest:
        print("There are failed thresholds!")
        sys.exit(1)
    else:
        print("All thresholds passed.")
        sys.exit(os.EX_OK)


if "discovery" in tests:
    topologyDiscoveryEvaluate()

if "crud" in tests:
    crudEvaluate()

if "events" in tests:
    print("Itt lenne az event ertekeles")

if "deregistration" in tests:
    topologyDeregistrationEvaluate()

writeResult()
evaluateResult()

sys.exit(os.EX_OK)
