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

TEST_RESULT_FILE = sys.argv[1]
char_arg = None
if len(sys.argv) > 2:
    char_arg = sys.argv[2]

print("Checking test result file: " + TEST_RESULT_FILE)
try:
    with open(TEST_RESULT_FILE, 'r') as f:
        input_json = json.load(f)

except IOError:
    print("Could not open file:", f)
    sys.exit(errno.EACCES)

#number_of_failed_tests = input_json['metrics']['checks']['fails']

number_of_passed_tests = input_json['metrics']['checks']['values']['passes']
if char_arg and char_arg == "char":
    number_of_failed_checks = input_json['metrics']['checks']['values']['fails']
else:
    try:
        number_of_failed_checks = input_json['metrics']['Errors']['values']['count']
    except:
        number_of_failed_checks = 0

print("Number of passed TCs: " + str(number_of_passed_tests))
string_json = json.dumps(input_json)

if (number_of_failed_checks != 0) :
    print("Number of failed TC checks: " + str(number_of_failed_checks))
    sys.exit(number_of_failed_checks)
elif 'Exception raised' in string_json :
    print ("There is/are exception(s) in the code, please check!")
    sys.exit(1)
else:
    print("All TCs passed.")
    sys.exit(os.EX_OK)
