# k8s/ingress-nginx

The configuration of ingress-nginx that is not the default (#224). ingress-nginx is installed with Helm
(release `ingress-nginx`, chart 4.15.1, namespace `ingress-nginx`), not by Argo CD: the values live here so that they
can be read and redone.

## Files

| File | Description |
|------|-------------|
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
