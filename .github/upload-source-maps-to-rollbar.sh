#!/bin/sh
version=$(git rev-parse HEAD)

post_server_item=$ROLLBAR_POST_SERVER_ITEM

echo "Uploading source maps for version $version!"

# We upload a source map for each resulting JavaScript
# file; the path depends on your build config
for path in $(find ${GITHUB_WORKSPACE}/dist -name "*.js"); do
  source_map="@$path.map"

  echo "Uploading source map for $url"

  curl --silent --show-error https://api.rollbar.com/api/1/sourcemap \
    -F access_token=$post_server_item \
    -F version=$version \
    -F source_map=$source_map \
    > /dev/null
done