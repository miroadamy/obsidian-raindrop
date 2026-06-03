export RAINDROP_TOKEN="5141f89e-615e-4ce2-a5e7-6d58057c6afd"
# Root collections
curl -s -H "Authorization: Bearer $RAINDROP_TOKEN" \
	"https://api.raindrop.io/rest/v1/collections" |
	jq '.items[] | @csv'

# Nested (child) collections
curl -s -H "Authorization: Bearer $RAINDROP_TOKEN" \
	"https://api.raindrop.io/rest/v1/collections/childrens" |
	jq '.items[] | @csv'
