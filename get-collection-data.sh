export RAINDROP_TOKEN="5141f89e-615e-4ce2-a5e7-6d58057c6afd"
# Root collections
curl -s -H "Authorization: Bearer $RAINDROP_TOKEN" \
	"https://api.raindrop.io/rest/v1/collections" |
	jq -r '
    (.items[0] | keys_unsorted) as $cols
    | ($cols | @csv),
      (.items[] | [ .[$cols[]] | if type=="object" or type=="array" then tojson else . end ] | @csv)
  '
