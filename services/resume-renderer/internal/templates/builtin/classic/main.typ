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
#set text(font: ("Liberation Sans", "Helvetica", "Arial"), size: opts.fontSize * 1pt, lang: "en")
#set par(leading: 0.6em, spacing: 0.7em)

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
      block(above: 0.9em, below: 0.9em, list(marker: [•], body-indent: 0.5em, spacing: 0.85em, ..items))
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

#let section(title, items, render) = {
  if items.len() > 0 [
    #block(width: 100%, breakable: false)[
      #text(size: 1.2em, weight: "bold", fill: accent)[#title]
    ]
    #v(-0.3em)
    #block(width: 100%, fill: card-fill, radius: 4pt, inset: (x: 8pt, y: 8pt))[
      #list(marker: [•], body-indent: 0.6em, spacing: 0.9em, ..items.map(render))
    ]
    #v(0.2em)
  ]
}

// Header
#align(center)[
  #{
    let contact = ()
    if profile.email != "" { contact.push(link("mailto:" + profile.email)[#profile.email]) }
    if profile.linkedin != "" { contact.push(link(href(profile.linkedin))[#profile.linkedin]) }
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
  #block(width: 100%, fill: card-fill, radius: 4pt, inset: 8pt)[#lines(profile.summary)]
  #v(0.2em)
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
])

#section("Projects", sections.projects, p => [
  *#p.title*#if p.tech.len() > 0 [ #text(fill: muted)[(#p.tech.join(", "))]]
  #if p.description != "" [#text(fill: muted)[#after-title(p.description)]]
])

#section("Education", sections.education, e => [
  #heading-line([*#e.degree*#if e.institution != "" [, #e.institution]], e.period)
])

#section("Technical Expertise", sections.skills, s => [
  *#s.name:* #s.tags.join(", ")
])
