# k8s/ingress-nginx

The configuration of ingress-nginx that is not the default (#224). ingress-nginx is installed with Helm
(release `ingress-nginx`, chart 4.15.1, namespace `ingress-nginx`), not by Argo CD: the values live here so that they
can be read and redone.

## Files

| File | Description |
|------|-------------|
| `values-static-cache.yaml` | A cache in nginx for `/_next/static/` (#253): the folder, the rules and the header `X-Cache`. Applied on top of the existing values with `--reuse-values`. Works together with `k8s/app/ingress-static.yaml`. |
| `values-client-ip.yaml` | What passes the visitor's real address to the application: PROXY protocol v2 on the OVH load balancer and in nginx, and no rewriting of the source address. Applied on top of the existing values with `--reuse-values`. |

## Why

Every request reached nginx with the address `146.59.241.129`, whoever sent it. The limits per address of the
application (sign-up, password reset, soon the login) then counted the whole site as one visitor. After the change the
first field of the nginx access log is the address of the visitor.

## Apply it

Both sides change in one `helm upgrade`: if only one of them knew about the PROXY header, nginx would refuse every
connection ("broken header"). The load balancer takes up to a minute to follow, and the controller pod restarts: expect a
short break, so do it at a quiet moment (UptimeRobot will report it).

```bash
# 1. What it would change (nothing is applied)
helm upgrade ingress-nginx ingress-nginx/ingress-nginx -n ingress-nginx --version 4.15.1 --reuse-values \
  -f k8s/ingress-nginx/values-client-ip.yaml --dry-run | grep -E "proxy|externalTraffic|real-ip"

# 2. Apply
helm upgrade ingress-nginx ingress-nginx/ingress-nginx -n ingress-nginx --version 4.15.1 --reuse-values \
  -f k8s/ingress-nginx/values-client-ip.yaml
kubectl -n ingress-nginx rollout status deploy/ingress-nginx-controller
```

## Check

```bash
curl -s https://fastresume.tech/api/livez -o /dev/null -w "%{http_code}\n"   # 200
curl -s ifconfig.me; echo                                                    # your public address
kubectl -n ingress-nginx logs deploy/ingress-nginx-controller --tail=5       # the first field must be that address
```

Send a request with a false header (`curl -H "X-Real-IP: 1.2.3.4" https://fastresume.tech/api/livez`): the log must still
show your own address, not 1.2.3.4.

## If something breaks

```bash
helm history ingress-nginx -n ingress-nginx          # note the revision before this one
helm rollback ingress-nginx <revision> -n ingress-nginx
```

## Left to do (#224)

A limit of request rate and of connections per address, and the size of a body, in `k8s/app/ingress.yaml`; a line in the
docs on which layer limits what.

## The cache of the static files (#253)

The files under `/_next/static/` (scripts, styles, fonts) carry a hash of their content in their name, so they never
change. nginx keeps them after the first request and no longer asks the app for them: before, the app read, compressed
and sent about 14 files for each first-time visitor.

It is two parts, in either order (each one alone changes nothing):

1. **Helm**, this folder: the cache and its folder (`values-static-cache.yaml`). The controller restarts: a break of a few
   seconds at the front door, so a quiet moment.
2. **Argo CD**, `k8s/app/ingress-static.yaml`: an Ingress for `/_next/static` with the buffering of nginx turned on for
   that path (ingress-nginx turns it off everywhere, and nginx does not cache what is not buffered).

```bash
# 1. What it would change (nothing is applied)
helm upgrade ingress-nginx ingress-nginx/ingress-nginx -n ingress-nginx --version 4.15.1 --reuse-values \
  -f k8s/ingress-nginx/values-static-cache.yaml --dry-run | grep -E "proxy_cache|static-cache"

# 2. Apply, then wait for the controller
helm upgrade ingress-nginx ingress-nginx/ingress-nginx -n ingress-nginx --version 4.15.1 --reuse-values \
  -f k8s/ingress-nginx/values-static-cache.yaml
kubectl -n ingress-nginx rollout status deploy/ingress-nginx-controller
# 3. Sync Argo CD (the Ingress app-static)
```

**Check** (a file of the page, asked twice; the first answer is a MISS, the next a HIT, and a page is never cached):

```bash
F=$(curl -s https://fastresume.tech/ | grep -o '/_next/static/chunks/[^"]*\.js' | head -1)
for i in 1 2; do curl -s -o /dev/null -D - -H 'Accept-Encoding: gzip' https://fastresume.tech$F | grep -i x-cache; done
curl -s -o /dev/null -D - https://fastresume.tech/login | grep -i x-cache      # BYPASS
```

Nothing to do at a deploy: the new build has new file names, the first visitors fill the cache, the old files are
dropped after 7 days without a request. The cache is empty after a restart of the controller and fills again by itself.

**Way back**: delete `k8s/app/ingress-static.yaml` from the kustomization (nothing is cached any more), and if needed
`helm rollback ingress-nginx <revision> -n ingress-nginx`.
