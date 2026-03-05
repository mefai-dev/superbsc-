"""BNB Chain on-chain data — TX Explorer, NFT Portfolio, Greenfield Storage."""

from fastapi import APIRouter, Query
from proxy.cache import fetch_json, post_json

router = APIRouter()

BSC_RPC = "https://bsc-dataseed1.binance.org"
GREENFIELD_API = "https://greenfield-sp.bnbchain.org"
BSC_SCAN = "https://api.bscscan.com/api"


async def _rpc_call(method: str, params: list, ttl: int = 30) -> dict:
    """Execute a BSC JSON-RPC call via the cache layer."""
    return await post_json(
        BSC_RPC,
        body={"jsonrpc": "2.0", "method": method, "params": params, "id": 1},
        ttl=ttl,
    )


# ── TX Explorer ──────────────────────────────────────────────────────


@router.get("/block")
async def get_block(
    number: str = Query("latest", description="Block number (hex) or 'latest'"),
):
    """Get block by number. Use hex like '0x1234' or 'latest'."""
    return await _rpc_call("eth_getBlockByNumber", [number, False], ttl=15)


@router.get("/tx")
async def get_transaction(
    hash: str = Query(..., min_length=66, max_length=66),
):
    """Get transaction by hash."""
    return await _rpc_call("eth_getTransactionByHash", [hash], ttl=60)


@router.get("/receipt")
async def get_receipt(
    hash: str = Query(..., min_length=66, max_length=66),
):
    """Get transaction receipt (status, gas used, logs)."""
    return await _rpc_call("eth_getTransactionReceipt", [hash], ttl=60)


@router.get("/balance")
async def get_balance(
    address: str = Query(..., min_length=42, max_length=42),
):
    """Get BNB balance for address."""
    return await _rpc_call("eth_getBalance", [address.lower(), "latest"], ttl=15)


@router.get("/block-number")
async def block_number():
    """Get latest block number."""
    return await _rpc_call("eth_blockNumber", [], ttl=5)


@router.get("/gas-price")
async def gas_price():
    """Get current gas price."""
    return await _rpc_call("eth_gasPrice", [], ttl=10)


# ── NFT Portfolio ────────────────────────────────────────────────────

# ERC721 balanceOf(address) selector
_ERC721_BALANCE = "0x70a08231"
# ERC721 tokenOfOwnerByIndex(address,index) selector
_ERC721_TOKEN_BY_INDEX = "0x2f745c59"


@router.get("/nft-balance")
async def nft_balance(
    owner: str = Query(..., min_length=42, max_length=42),
    contract: str = Query(..., min_length=42, max_length=42),
):
    """Get NFT balance (ERC721) for owner at contract."""
    data = owner.lower().replace("0x", "").zfill(64)
    return await _rpc_call(
        "eth_call",
        [{"to": contract.lower(), "data": f"{_ERC721_BALANCE}{data}"}, "latest"],
        ttl=30,
    )


@router.get("/nft-tokens")
async def nft_tokens(
    owner: str = Query(..., min_length=42, max_length=42),
    contract: str = Query(..., min_length=42, max_length=42),
    count: int = Query(10, ge=1, le=50),
):
    """Get NFT token IDs owned by address (ERC721Enumerable)."""
    addr_padded = owner.lower().replace("0x", "").zfill(64)
    results = []
    for i in range(count):
        idx = hex(i)[2:].zfill(64)
        r = await _rpc_call(
            "eth_call",
            [
                {
                    "to": contract.lower(),
                    "data": f"{_ERC721_TOKEN_BY_INDEX}{addr_padded}{idx}",
                },
                "latest",
            ],
            ttl=60,
        )
        if r and r.get("result") and r["result"] != "0x":
            results.append({"index": i, "tokenId": r["result"]})
        else:
            break
    return {"tokens": results, "contract": contract, "owner": owner}


# ── Greenfield Storage ───────────────────────────────────────────────


@router.get("/greenfield/status")
async def greenfield_status():
    """Greenfield SP (Storage Provider) status."""
    return await fetch_json(f"{GREENFIELD_API}/status", ttl=30)


@router.get("/greenfield/buckets")
async def greenfield_buckets(
    address: str = Query(..., min_length=42, max_length=42),
):
    """List buckets for a Greenfield account address."""
    return await fetch_json(
        f"{GREENFIELD_API}/",
        params={"user-address": address.lower()},
        ttl=60,
    )
