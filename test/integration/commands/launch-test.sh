cd test/integration/packages/${package_to_launch}

LOG_SEP=">>>>>>>>>>>>>>>"

echo "$LOG_SEP INSTALLING \"${package_to_launch}\" PACKAGE DEPENDENCIES"
npm i

echo "$LOG_SEP LAUNCHING \"${package_to_launch}\" PACKAGE TESTS"
npm test ${narval_options}
