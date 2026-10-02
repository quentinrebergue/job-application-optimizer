package api

import "github.com/prometheus/client_golang/prometheus"

type metrics struct {
	renders  *prometheus.CounterVec
	duration *prometheus.HistogramVec
	inFlight prometheus.Gauge
}

// newMetrics registers the service's own metrics. Labels only ever hold values
// the service controls (a known template id or "unknown", a fixed outcome),
// never text sent by a client: an attacker must not be able to create
// unbounded time series.
func newMetrics(reg prometheus.Registerer) *metrics {
	m := &metrics{
		renders: prometheus.NewCounterVec(prometheus.CounterOpts{
			Namespace: "resume_renderer",
			Name:      "renders_total",
			Help:      "Render requests by template and outcome.",
		}, []string{"template", "status"}),
		duration: prometheus.NewHistogramVec(prometheus.HistogramOpts{
			Namespace: "resume_renderer",
			Name:      "render_duration_seconds",
			Help:      "Time spent rendering a PDF, for requests that reached Typst.",
			Buckets:   []float64{0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 15},
		}, []string{"template"}),
		inFlight: prometheus.NewGauge(prometheus.GaugeOpts{
			Namespace: "resume_renderer",
			Name:      "renders_in_flight",
			Help:      "Renders currently running.",
		}),
	}
	reg.MustRegister(m.renders, m.duration, m.inFlight)
	return m
}
