// Classic: single column, light cards, bold titles.
// Reads data.json, written next to this file by the renderer for each request.
// Every value comes from JSON strings, so it is shown as plain text and never
// interpreted as Typst markup.
#let data = json("data.json")
#let profile = data.profile
#let sections = data.sections
#let opts = data.options

#let accent = rgb(opts.accentColor)
#let muted = luma(90)
#let card-fill = luma(246)

#set document(title: profile.name + " - Resume", author: profile.name)
#set page(paper: "a4", margin: (x: 1cm, y: 1cm))
#set text(font: ("Liberation Sans", "Helvetica", "Arial"), lang: "en")

// BEGIN lines
// A description is plain text. A line that starts with a dash or a bullet followed by a space is a point: a run of
// such lines is printed as a list (a bullet, a hanging indent). Other lines keep their breaks. A dash inside a
// sentence, a negative number ("-5 %": no space after the dash) and a line of dashes only are not points.
#let point-marker = regex("^\\s*[-–—•*]\\s+")
#let is-point(l) = l.match(regex("^\\s*[-–—•*]\\s+\\S")) != none
// The lines of a description in runs: ("list", points) for consecutive points, ("text", lines) for the others.
#let groups(s) = {
  let out = ()
  for l in s.replace("\r", "").split("\n") {
    let kind = if is-point(l) { "list" } else { "text" }
    let item = if kind == "list" { l.replace(point-marker, "") } else { l }
    let n = out.len()
    if n > 0 and out.at(n - 1).at(0) == kind {
      out.at(n - 1).at(1).push(item)
    } else {
      out.push((kind, (item,)))
    }
  }
  out
}
#let lines(s) = {
  for (kind, items) in groups(s) {
    if kind == "list" {
      list(marker: [•], body-indent: 0.5em, tight: false, ..items)
    } else {
      items.join(linebreak())
    }
  }
}
// After a project's title: its text follows on the same line, after a dash; a list starts under the title instead.
#let after-title(s) = if groups(s).first().at(0) == "list" {
  linebreak()
  lines(s)
} else [ — #lines(s)]
// END lines

#let href(url) = if url.starts-with("http") { url } else { "https://" + url }

// The title of a project, a link to it when the project has one.
#let project-title(p) = if p.url != "" { link(href(p.url))[*#p.title*] } else [*#p.title*]

// Dates sit right after the title by default ("inline"): a date pushed to the
// far right can be split from its job by ATS parsers that group text by position.
#let heading-line(left, right) = if opts.datePlacement == "right" {
  grid(
    columns: (1fr, auto),
    column-gutter: 1em,
    left,
    text(size: 0.9em, fill: muted)[#right],
  )
} else if right == "" {
  left
} else {
  [#left #text(fill: muted)[| #right]]
}

#let section(title, items, render, sp) = {
  if items.len() > 0 [
    #block(width: 100%, breakable: false)[
      #text(size: 1.2em, weight: "bold", fill: accent)[#title]
    ]
    #v(-0.3em)
    #block(width: 100%, fill: card-fill, radius: 4pt, inset: (x: 8pt, y: 8pt * sp))[
      #list(marker: [•], body-indent: 0.6em, spacing: 0.9em * sp, ..items.map(render))
    ]
    #v(0.2em * sp)
  ]
}

// The whole page at a text scale `k` (1 = the size of the options) and a gap scale `sp`.
#let page-body(k, sp) = {
  set text(size: opts.fontSize * k * 1pt)
  set par(leading: (0.45 + 0.15 * calc.min(sp, 2)) * 1em, spacing: 0.85em * sp)
  [
// Header
#align(center)[
  #{
    let contact = ()
    if profile.email != "" { contact.push(link("mailto:" + profile.email)[#profile.email]) }
    if profile.linkedin != "" { contact.push(link(href(profile.linkedin))[#profile.linkedin]) }
    if profile.github != "" { contact.push(link(href(profile.github))[#profile.github]) }
    if profile.phone != "" { contact.push([#profile.phone]) }
    if profile.address != "" { contact.push([#profile.address]) }
    text(size: 0.8em, style: "italic", fill: muted)[#contact.join([ #h(0.3em)|#h(0.3em) ])]
  }
  #v(0.2em)
  #text(size: 1.7em, weight: "bold")[#profile.name]
  #if profile.title != "" [
    \ #text(size: 1.05em, fill: muted)[#profile.title]
  ]
]

#if profile.summary != "" [
  #text(size: 1.2em, weight: "bold", fill: accent)[Profile]
  #v(-0.3em)
  #block(width: 100%, fill: card-fill, radius: 4pt, inset: (x: 8pt, y: 8pt * sp))[#lines(profile.summary)]
  #v(0.2em * sp)
]

#section("Work Experience", sections.experiences, e => [
  #heading-line(
    [*#e.title#if e.company != "" [, #e.company]*#if e.location != "" [, #e.location]],
    e.period,
  )
  #if e.description != "" [
    #v(0.2em)
    #text(fill: muted)[#lines(e.description)]
  ]
], sp)

#section("Projects", sections.projects, p => [
  // The tools: the colour of the text and a regular weight, next to the bold title.
  #project-title(p)#if p.tech.len() > 0 [ #text(weight: "regular")[(#p.tech.join(", "))]]
  // The text goes under the title and its tools, on its own lines, whatever it holds (a text or points), as for a job.
  #if p.description != "" [
    #v(0.2em)
    #text(fill: muted)[#lines(p.description)]
  ]
], sp)

#section("Education", sections.education, e => [
  #heading-line([*#e.degree*#if e.institution != "" [, #e.institution]], e.period)
], sp)

#section("Skills", sections.skills, s => [
  *#s.name:* #s.tags.join(", ")
], sp)
  ]
}

// Fit to the page (#306): with "fitToPage" on, the content is laid out at several sizes and the largest that fits one
// page is kept, so a short resume does not leave a gap at the bottom and a long one is not cut onto a second page.
// `t` runs along one path from the tightest to the loosest look: first the text and the gaps shrink together down to
// 75 % and 60 %, then (t = 1, the look set by the options) the text grows to 115 %, then only the gaps grow.
#let look(t) = if t <= 1 {
  (0.75 + 0.25 * t, 0.6 + 0.4 * t)
} else if t <= 2 {
  (1 + 0.15 * (t - 1), 1.0)
} else {
  (1.15, 1 + 1.2 * (t - 2))
}

#layout(size => {
  let fits(t) = {
    let (k, sp) = look(t)
    measure(page-body(k, sp), width: size.width).height <= size.height
  }
  let t = if opts.fitToPage != "yes" { 1.0 } else if fits(3.0) { 3.0 } else if not fits(0.0) {
    // Even the tightest look needs more than a page: keep the normal look and let it run onto the next one.
    1.0
  } else {
    let (lo, hi) = (0.0, 3.0)
    for _ in range(12) {
      let mid = (lo + hi) / 2
      if fits(mid) { lo = mid } else { hi = mid }
    }
    lo
  }
  let (k, sp) = look(t)
  page-body(k, sp)
})
