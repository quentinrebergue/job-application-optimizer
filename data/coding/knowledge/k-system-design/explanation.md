# System Design Fundamentals

## Framework for Any Design Interview
1. **Clarify requirements** — functional (what it does) vs non-functional (scale, latency, availability)
2. **Estimate scale** — DAU, QPS, storage (use back-of-envelope math)
3. **High-level design** — draw the major boxes (client, API gateway, services, DB, cache)
4. **Deep dives** — pick 2–3 components and go deep (DB schema, cache policy, message queue)
5. **Trade-offs** — explicitly state what you sacrifice (consistency vs availability, etc.)

## Core Building Blocks

### Load Balancer
Distributes traffic across servers. Round-robin, least-connections, or consistent hashing.

### Cache
Reduces DB load, lowers latency. Patterns:
- **Cache-aside** (lazy): app checks cache first, writes on miss
- **Write-through**: write to cache + DB together
- **TTL** controls staleness

### Database
| | SQL (Postgres, MySQL) | NoSQL (Cassandra, DynamoDB) |
|---|---|---|
| Schema | Rigid | Flexible |
| Joins | Yes | No |
| Scale | Vertical + read replicas | Horizontal sharding |
| ACID | Full | Often eventual consistency |

### Message Queue (Kafka, SQS)
Decouples producers from consumers. Enables async processing, retries, backpressure.

### CDN
Serves static assets from edge nodes close to users. Reduces origin load.

## Key Concepts
- **Horizontal scaling**: add more machines. **Vertical**: add more CPU/RAM.
- **CAP theorem**: Consistency, Availability, Partition tolerance — pick 2.
- **Consistent hashing**: distribute keys across nodes with minimal rehashing when nodes join/leave.
- **Rate limiting**: Token bucket or leaky bucket — protect APIs from abuse.
- **Idempotency**: safe to retry an operation without side effects (important for payment, messaging).

## Numbers to Know
| Operation | Latency |
|-----------|---------|
| L1 cache ref | ~1 ns |
| RAM access | ~100 ns |
| SSD read | ~100 µs |
| Network (same DC) | ~500 µs |
| Network (cross-region) | ~150 ms |