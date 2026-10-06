# DNS zone of fastresume.tech, managed as code (#127).
# The SOA and NS records are left to OVH: they are not managed here.

locals {
  zone = "fastresume.tech"
  ip   = "51.68.80.189" # load balancer of the ingress

  records = {
    apex_a = { subdomain = "", fieldtype = "A", target = local.ip }
    www_a  = { subdomain = "www", fieldtype = "A", target = local.ip }

    # Mail received at @fastresume.tech (OVH mail)
    mx1 = { subdomain = "", fieldtype = "MX", target = "1 mx1.mail.ovh.net." }
    mx2 = { subdomain = "", fieldtype = "MX", target = "5 mx2.mail.ovh.net." }
    mx3 = { subdomain = "", fieldtype = "MX", target = "100 mx3.mail.ovh.net." }

    # Servers allowed to send mail for the domain; Scaleway (fallback) is added later in #124.
    # Brevo needs no SPF entry: it sends from its own return path and passes DMARC through DKIM.
    spf = { subdomain = "", fieldtype = "SPF", target = "v=spf1 include:mx.ovh.com -all" }

    # Brevo (transactional mail, #124)
    brevo_code  = { subdomain = "", fieldtype = "TXT", target = "\"brevo-code:20dc23b68182507ed49a385119947574\"" }
    brevo_dkim1 = { subdomain = "brevo1._domainkey", fieldtype = "CNAME", target = "b1.fastresume-tech.dkim.brevo.com." }
    brevo_dkim2 = { subdomain = "brevo2._domainkey", fieldtype = "CNAME", target = "b2.fastresume-tech.dkim.brevo.com." }
    dmarc       = { subdomain = "_dmarc", fieldtype = "TXT", target = "\"v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com\"" }
  }
}

resource "ovh_domain_zone_record" "this" {
  for_each = local.records

  zone      = local.zone
  subdomain = each.value.subdomain
  fieldtype = each.value.fieldtype
  target    = each.value.target
  ttl       = 0 # 0 = the zone default ($TTL 3600)
}
