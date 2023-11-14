
function do_rpc {
	curl -s --header "Content-Type: application/json" -XPOST --data "{\"id\":1,\"jsonrpc\":\"2.0\",\"method\":\"$1\",\"params\":[$2]}" "$RPC_URL"
}
