/*
 * ncs-charts: a chart kit for admin reports (the board report uses it). Plain JS, no library, no build step.
 * PORTABLE: nothing here knows about Theology Matters; pair it with ncs-charts.css. The same files go to other sites.
 *
 *   ncsCharts.render( figureEl, spec )  draws into a <figure>; call it again to redraw
 *   ncsCharts.auto( root )              finds every [data-chart] under root, reads the JSON spec from a
 *                                      <script type="application/json"> child and renders it
 *   ncsCharts.toPng( figureEl )         extra helper: a Promise of the PNG Blob that "Save picture" downloads
 *
 * spec: { title, type, types, labels, series: [ { name, values, tone } ], format, note, states, compact, order,
 *         locale, currency }
 *   type    bar | line | area | stacked | donut | rank | tilemap
 *   tone    now | then | navy | ox | muted
 *   format  number | money | percent (percent values are fractions: 0.42 is 42%)
 *   locale, currency  how numbers and money are written: from the spec, else ncsCharts.defaults
 *           ( { locale, currency }, which the page may set ), else en-US and USD. One page, one way of writing
 *           numbers: the last chart drawn sets it for the readings that follow.
 *   null    a value of null means "not tracked yet": a gap and a hatched band, never a zero
 *   states  tilemap only: USPS code (or full state name) -> value
 *   order   rank only: 'given' keeps the rows in the order of the labels (periods of time) instead of largest first
 *   compact true (or data-compact on the figure) draws the small form for a grid of charts: the type switch and
 *           one "More" menu (Enlarge, Table, Save picture, Copy numbers) in place of the row of buttons, the
 *           colour key as HTML above the drawing (two lines at most), the reading shown over the foot of the
 *           chart, the note cut to two lines. Enlarge opens the same chart in a dialog at full size.
 *           The drawing's height: when the page sets --ncs-chart-plot-h on the figure (the board report does,
 *           one value for a whole grid), every kind of chart is drawn to exactly that height, so charts side by
 *           side share one plot box, one top grid line and one baseline. Without it: about 200 to 250 px.
 *
 * Colours come from the --ncs-chart-* custom properties through the classes in ncs-charts.css. Set them on the
 * figure or on anything around it; put data-ncs-board on that element and the Enlarge dialog opens inside it,
 * where the colours are (otherwise it opens in the body). The names: navy, ox, then, muted, ok, warn (the tones),
 * ink, text, paper, bone, cream, line, line-strong, on-dark, shadow, sans, serif. Each chart is drawn at the real width of its box (and drawn again
 * when the box changes), so text stays the same size on a phone and on a wide screen.
 *
 * The text sizes in FONTS below are used to measure labels; keep them the same as the CSS.
 */
( function () {
	'use strict';

	var NS = 'http://www.w3.org/2000/svg';
	var NOT_YET = 'not tracked yet';
	var HINT = 'Point at the chart, or select it and use the arrow keys, to read each number.';
	var TYPES = { bar: 'Bars', line: 'Line', area: 'Area', stacked: 'Stacked', donut: 'Donut', rank: 'Ranked', tilemap: 'Map' };
	var KIND = { bar: 'Bar chart', line: 'Line chart', area: 'Area chart', stacked: 'Stacked bar chart', donut: 'Donut chart', rank: 'Ranked list', tilemap: 'Map of US states' };
	var TONES = { now: 'ox', then: 'then', navy: 'navy', ox: 'ox', muted: 'muted' };
	var CYCLE = [ 'ox', 'navy', 'then', 'warn', 'ok', 'muted', 'soft' ];
	var FONTS = {
		axis: [ '500', 11, 'sans' ],
		key: [ '500', 12, 'sans' ],
		val: [ '600', 11, 'sans' ],
		name: [ '500', 13, 'sans' ],
		gap: [ 'italic 400', 11, 'sans' ],
		total: [ '600', 24, 'serif' ]
	};
	var uid = 0;

	// US states on an 11 by 8 grid of squares: [ code, column, row, name ].
	var TILES = [
		[ 'AK', 0, 0, 'Alaska' ], [ 'ME', 10, 0, 'Maine' ],
		[ 'VT', 9, 1, 'Vermont' ], [ 'NH', 10, 1, 'New Hampshire' ],
		[ 'WA', 0, 2, 'Washington' ], [ 'ID', 1, 2, 'Idaho' ], [ 'MT', 2, 2, 'Montana' ], [ 'ND', 3, 2, 'North Dakota' ], [ 'MN', 4, 2, 'Minnesota' ], [ 'IL', 5, 2, 'Illinois' ], [ 'WI', 6, 2, 'Wisconsin' ], [ 'MI', 7, 2, 'Michigan' ], [ 'NY', 8, 2, 'New York' ], [ 'RI', 9, 2, 'Rhode Island' ], [ 'MA', 10, 2, 'Massachusetts' ],
		[ 'OR', 0, 3, 'Oregon' ], [ 'NV', 1, 3, 'Nevada' ], [ 'WY', 2, 3, 'Wyoming' ], [ 'SD', 3, 3, 'South Dakota' ], [ 'IA', 4, 3, 'Iowa' ], [ 'IN', 5, 3, 'Indiana' ], [ 'OH', 6, 3, 'Ohio' ], [ 'PA', 7, 3, 'Pennsylvania' ], [ 'NJ', 8, 3, 'New Jersey' ], [ 'CT', 9, 3, 'Connecticut' ],
		[ 'CA', 0, 4, 'California' ], [ 'UT', 1, 4, 'Utah' ], [ 'CO', 2, 4, 'Colorado' ], [ 'NE', 3, 4, 'Nebraska' ], [ 'MO', 4, 4, 'Missouri' ], [ 'KY', 5, 4, 'Kentucky' ], [ 'WV', 6, 4, 'West Virginia' ], [ 'VA', 7, 4, 'Virginia' ], [ 'MD', 8, 4, 'Maryland' ], [ 'DE', 9, 4, 'Delaware' ],
		[ 'AZ', 1, 5, 'Arizona' ], [ 'NM', 2, 5, 'New Mexico' ], [ 'KS', 3, 5, 'Kansas' ], [ 'AR', 4, 5, 'Arkansas' ], [ 'TN', 5, 5, 'Tennessee' ], [ 'NC', 6, 5, 'North Carolina' ], [ 'SC', 7, 5, 'South Carolina' ], [ 'DC', 8, 5, 'District of Columbia' ],
		[ 'OK', 3, 6, 'Oklahoma' ], [ 'LA', 4, 6, 'Louisiana' ], [ 'MS', 5, 6, 'Mississippi' ], [ 'AL', 6, 6, 'Alabama' ], [ 'GA', 7, 6, 'Georgia' ],
		[ 'HI', 0, 7, 'Hawaii' ], [ 'TX', 3, 7, 'Texas' ], [ 'FL', 8, 7, 'Florida' ]
	];
	var STATE_NAME = {};
	var STATE_CODE = {};
	TILES.forEach( function ( t ) {
		STATE_NAME[ t[ 0 ] ] = t[ 3 ];
		STATE_CODE[ t[ 3 ].toLowerCase() ] = t[ 0 ];
		STATE_CODE[ t[ 0 ].toLowerCase() ] = t[ 0 ];
	} );

	/* ---------- Small helpers ---------- */

	function mk( name, attrs, text ) {
		var n = document.createElementNS( NS, name );
		Object.keys( attrs || {} ).forEach( function ( a ) {
			n.setAttribute( a, attrs[ a ] );
		} );
		if ( text !== undefined && text !== null ) {
			n.textContent = text;
		}
		return n;
	}

	function el( tag, cls, text ) {
		var n = document.createElement( tag );
		if ( cls ) {
			n.className = cls;
		}
		if ( text !== undefined && text !== null ) {
			n.textContent = text;
		}
		n.setAttribute( 'data-ncsc', '' );
		return n;
	}

	function num( v ) {
		if ( v === null || v === undefined || v === '' ) {
			return null;
		}
		v = Number( v );
		return isFinite( v ) ? v : null;
	}

	function r1( v ) {
		return Math.round( v * 10 ) / 10;
	}

	// The height a compact chart aims for at a given width, so charts side by side line up.
	function compactH( W ) {
		return W < 340 ? 204 : ( W < 520 ? 228 : ( W < 700 ? 240 : 250 ) );
	}

	/* ---------- Numbers (the spec's locale and currency, else ncsCharts.defaults, else en-US and USD) ---------- */

	var FORMATS = {};
	function formats( locale, currency ) {
		var key = locale + '|' + currency;
		if ( ! FORMATS[ key ] ) {
			var nf = function ( opts ) {
				return new Intl.NumberFormat( locale, opts );
			};
			FORMATS[ key ] = {
				whole: nf( { maximumFractionDigits: 0 } ),
				one: nf( { maximumFractionDigits: 1 } ),
				compact: nf( { notation: 'compact', maximumFractionDigits: 1 } ),
				money: nf( { style: 'currency', currency: currency, maximumFractionDigits: 0 } ),
				cents: nf( { style: 'currency', currency: currency, minimumFractionDigits: 2, maximumFractionDigits: 2 } ),
				pct: nf( { style: 'percent', maximumFractionDigits: 1 } ),
				share: nf( { style: 'percent', maximumFractionDigits: 0 } )
			};
		}
		return FORMATS[ key ];
	}
	function formatsFor( spec ) {
		var d = ( window.ncsCharts && window.ncsCharts.defaults ) || {};
		return formats( ( spec && spec.locale ) || d.locale || 'en-US', ( spec && spec.currency ) || d.currency || 'USD' );
	}
	var F = formats( 'en-US', 'USD' );

	// The full number, for labels, tooltips and the table.
	function full( v, format ) {
		if ( v === null ) {
			return NOT_YET;
		}
		if ( 'money' === format ) {
			return ( Math.abs( v ) >= 1000 || v === Math.round( v ) ) ? F.money.format( v ) : F.cents.format( v );
		}
		if ( 'percent' === format ) {
			return F.pct.format( v );
		}
		return v === Math.round( v ) ? F.whole.format( v ) : F.one.format( v );
	}

	// The short number, for axis ticks: 2.5K, $12K, 40%.
	function tick( v, format ) {
		if ( 'money' === format ) {
			return '$' + F.compact.format( v );
		}
		if ( 'percent' === format ) {
			return F.pct.format( v );
		}
		return F.compact.format( v );
	}

	// Four even steps on round numbers that reach at least the largest value.
	function niceScale( max, format ) {
		if ( ! ( max > 0 ) ) {
			max = 'percent' === format ? 1 : 4;
		}
		var raw = max / 4;
		var p = Math.pow( 10, Math.floor( Math.log10( raw ) ) );
		var whole = 'percent' !== format;
		if ( whole && p < 1 ) {
			p = 1;
		}
		var steps = ( whole && 1 === p ) ? [ 1, 2, 3, 5, 10 ] : [ 1, 2, 2.5, 5, 10 ];
		var m = raw / p;
		var step = steps[ steps.length - 1 ] * p;
		for ( var i = 0; i < steps.length; i++ ) {
			if ( steps[ i ] >= m - 1e-9 ) {
				step = steps[ i ] * p;
				break;
			}
		}
		return { step: step, top: step * 4 };
	}

	// A slice's share of the whole: a small one is "<1%", never "0%".
	function shareText( share ) {
		return share > 0 && share < 0.005 ? '<1%' : F.share.format( share );
	}

	/* ---------- The numbers behind a chart ---------- */

	function stateCode( key ) {
		return STATE_CODE[ String( key ).trim().toLowerCase() ] || null;
	}

	function normalise( spec ) {
		var labels = ( spec.labels || [] ).map( String );
		var series = ( spec.series || [] ).map( function ( s, i ) {
			var vals = s.values || [];
			return {
				name: s.name || 'Series ' + ( i + 1 ),
				tone: TONES[ s.tone ] || null,
				values: labels.map( function ( l, j ) {
					return num( vals[ j ] );
				} )
			};
		} );
		var states = null;
		var wantsMap = 'tilemap' === spec.type || ( spec.types || [] ).indexOf( 'tilemap' ) > -1;
		if ( spec.states ) {
			states = {};
			Object.keys( spec.states ).forEach( function ( k ) {
				var code = stateCode( k );
				var v = num( spec.states[ k ] );
				if ( code && v !== null ) {
					states[ code ] = ( states[ code ] || 0 ) + v;
				}
			} );
		} else if ( wantsMap && series.length ) {
			states = {};
			labels.forEach( function ( l, j ) {
				var code = stateCode( l );
				if ( code && series[ 0 ].values[ j ] !== null ) {
					states[ code ] = ( states[ code ] || 0 ) + series[ 0 ].values[ j ];
				}
			} );
		}
		// A map with no series still gets rows, largest first, so Table, Copy and the Ranked view work.
		if ( states && ! series.length ) {
			var codes = Object.keys( states ).sort( function ( a, b ) {
				return states[ b ] - states[ a ] || ( a < b ? -1 : 1 );
			} );
			labels = codes.map( function ( c ) {
				return STATE_NAME[ c ];
			} );
			series = [ { name: spec.valueName || 'Number', tone: null, values: codes.map( function ( c ) {
				return states[ c ];
			} ) } ];
		}
		series.forEach( function ( s, i ) {
			s.tone = s.tone || CYCLE[ i % CYCLE.length ];
		} );
		var rowHead = spec.states ? 'State' : ( /^(donut|rank|tilemap)$/.test( spec.type ) ? 'Name' : 'Period' );
		return { labels: labels, series: series, states: states, rowHead: rowHead };
	}

	/* ---------- Drawing context: one per SVG ---------- */

	function context( st, W ) {
		var c = { st: st, W: W, id: 'ncsc' + ( ++uid ), items: [], format: st.spec.format || 'number' };
		c.svg = mk( 'svg', { xmlns: NS, role: 'img', focusable: 'true', tabindex: '0', 'class': 'ncs-chart__svg is-' + st.type } );
		c.add = function ( name, attrs, text, parent ) {
			return ( parent || c.svg ).appendChild( mk( name, attrs, text ) );
		};
		c.text = function ( x, y, str, cls, anchor, parent ) {
			return c.add( 'text', { x: r1( x ), y: r1( y ), 'class': 'ncs-chart__' + cls, 'text-anchor': anchor || 'start' }, str, parent );
		};
		c.measure = function ( str, key ) {
			return measure( st, str, key );
		};
		// Shorten a label with an ellipsis until it fits.
		c.fit = function ( str, key, maxW ) {
			if ( c.measure( str, key ) <= maxW ) {
				return str;
			}
			var s = str;
			while ( s.length > 1 && c.measure( s + '…', key ) > maxW ) {
				s = s.slice( 0, -1 );
			}
			return s.replace( /\s+$/, '' ) + '…';
		};
		// The hatch used wherever a number is "not tracked yet".
		c.hatch = function () {
			if ( ! c.hatchId ) {
				c.hatchId = c.id + '-hatch';
				var defs = c.add( 'defs', {} );
				var pat = c.add( 'pattern', { id: c.hatchId, width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, null, defs );
				c.add( 'line', { x1: 0, y1: 0, x2: 0, y2: 6, 'class': 'ncs-chart__hatch' }, null, pat );
			}
			return 'url(#' + c.hatchId + ')';
		};
		// A part the reader can point at or reach with the arrow keys.
		c.item = function ( g, tip ) {
			g.setAttribute( 'class', ( g.getAttribute( 'class' ) || '' ) + ' ncs-chart__item' );
			g.insertBefore( mk( 'title', {}, tip ), g.firstChild );
			c.items.push( { el: g, tip: tip } );
		};
		return c;
	}

	var probe = null;
	function measure( st, str, key ) {
		if ( ! probe ) {
			probe = document.createElement( 'canvas' ).getContext( '2d' );
		}
		var f = FONTS[ key ];
		probe.font = f[ 0 ] + ' ' + f[ 1 ] + 'px ' + ( 'serif' === f[ 2 ] ? st.serif : st.sans );
		return probe.measureText( str ).width;
	}

	// A row of colour keys that wraps; returns the height it used.
	// The compact form keeps the key out of the drawing (render() writes it as HTML above the plot), so the
	// drawing is the same height whether a chart has a key or not.
	function legend( c, keys, y ) {
		if ( ! keys.length ) {
			return 0;
		}
		if ( c.st.compact ) {
			c.keys = ( c.keys || [] ).concat( keys );
			return 0;
		}
		var x = 0, row = 0;
		keys.forEach( function ( k ) {
			var w = 16 + c.measure( k.name, 'key' );
			if ( x > 0 && x + w > c.W ) {
				x = 0;
				row++;
			}
			var top = y + row * 20;
			if ( k.hatch ) {
				c.add( 'rect', { x: x, y: top + 3, width: 10, height: 10, fill: c.hatch(), 'class': 'ncs-chart__gap' } );
			} else {
				c.add( 'rect', { x: x, y: top + 3, width: 10, height: 10, 'class': 'ncs-chart__sw ' + k.cls } );
			}
			c.text( x + 16, top + 12.5, k.name, 'key' );
			x += w + 18;
		} );
		return ( row + 1 ) * 20 + 6;
	}

	/* ---------- Bars, grouped bars, stacked bars, line, area ---------- */

	function drawXY( c ) {
		var d = c.st.data, type = c.st.type, W = c.W;
		var S = d.series, n = d.labels.length, ns = S.length;
		var stacked = 'stacked' === type, bars = 'bar' === type || stacked;
		var max = 0, gapAt = [], anyGap = false, i, s;
		for ( i = 0; i < n; i++ ) {
			var sum = 0, missing = ! ns;
			for ( s = 0; s < ns; s++ ) {
				var v = S[ s ].values[ i ];
				if ( null === v ) {
					missing = true;
				} else {
					sum += Math.max( 0, v );
					max = Math.max( max, v );
				}
			}
			if ( stacked ) {
				max = Math.max( max, sum );
			}
			gapAt.push( missing );
			anyGap = anyGap || missing;
		}
		var sc = niceScale( max, c.format );

		var keys = ns > 1 ? S.map( function ( x ) {
			return { name: x.name, cls: 't-' + x.tone };
		} ) : [];
		if ( anyGap ) {
			keys.push( { name: 'Not tracked yet', hatch: true } );
		}
		var padT = legend( c, keys, 0 ) + ( c.st.compact ? 12 : 16 );
		var padB = 26;
		var plotH = c.st.compact ? Math.max( 60, ( c.st.plotH || compactH( W ) ) - padT - padB ) : ( W < 420 ? 190 : 250 );
		var padL = 0;
		for ( i = 0; i <= 4; i++ ) {
			padL = Math.max( padL, c.measure( tick( sc.step * i, c.format ), 'axis' ) );
		}
		padL = Math.ceil( padL ) + 8;
		var base = padT + plotH;
		var colW = ( W - padL ) / Math.max( 1, n );
		var y = function ( val ) {
			return padT + plotH * ( 1 - Math.max( 0, val ) / sc.top );
		};
		var cx = function ( idx ) {
			return padL + colW * ( idx + 0.5 );
		};

		// Grid: four lines above a slightly stronger baseline.
		for ( i = 0; i <= 4; i++ ) {
			var gy = r1( y( sc.step * i ) );
			c.add( 'line', { x1: padL, x2: W, y1: gy, y2: gy, 'class': i ? 'ncs-chart__grid' : 'ncs-chart__base' } );
			c.text( padL - 8, gy + 4, tick( sc.step * i, c.format ), 'axis', 'end' );
		}

		// Hatched bands over each run of months that were not tracked.
		var labelW = c.measure( NOT_YET, 'gap' ), gapLabels = [];
		for ( i = 0; i < n; i++ ) {
			if ( ! gapAt[ i ] ) {
				continue;
			}
			var from = i;
			while ( i + 1 < n && gapAt[ i + 1 ] ) {
				i++;
			}
			var bx = padL + colW * from, bw = colW * ( i - from + 1 );
			c.add( 'rect', { x: r1( bx ), y: padT, width: r1( bw ), height: plotH, fill: c.hatch(), 'class': 'ncs-chart__gap' } );
			if ( bw >= labelW + 14 ) {
				gapLabels.push( bx + bw / 2 ); // drawn after the bars and lines, so it is never behind them
			}
		}

		if ( bars ) {
			var per = stacked ? 1 : ns;
			var bwid = Math.max( 1.5, Math.min( stacked ? 34 : 26, colW * 0.74 / per ) );
			var gap = bwid >= 6 && per > 1 ? 1 : 0;
			var groupW = bwid * per + gap * ( per - 1 );
			var showVals = 1 === ns && colW >= 46;
			for ( i = 0; i < n; i++ ) {
				var acc = 0;
				for ( s = 0; s < ns; s++ ) {
					var val = S[ s ].values[ i ];
					if ( null === val ) {
						continue;
					}
					var top = stacked ? y( acc + val ) : y( val );
					var bot = stacked ? y( acc ) : base;
					var h = Math.max( val > 0 ? 1 : 0, bot - top );
					var x = stacked ? cx( i ) - bwid / 2 : cx( i ) - groupW / 2 + s * ( bwid + gap );
					c.add( 'rect', { x: r1( x ), y: r1( bot - h ), width: r1( bwid ), height: r1( h ), 'class': 'ncs-chart__bar t-' + S[ s ].tone + ( stacked ? ' is-stacked' : '' ) } );
					if ( showVals ) {
						c.text( cx( i ), bot - h - 5, tick( val, c.format ), 'val', 'middle' );
					}
					acc += Math.max( 0, val );
				}
			}
		} else {
			// Lines break at every gap; a point with no neighbour is drawn as a dot.
			var dots = colW >= 12;
			S.forEach( function ( ser ) {
				var seg = [];
				var flush = function () {
					if ( ! seg.length ) {
						return;
					}
					var pts = seg.map( function ( p ) {
						return r1( cx( p ) ) + ',' + r1( y( ser.values[ p ] ) );
					} );
					if ( 'area' === type && seg.length > 1 ) {
						c.add( 'path', { d: 'M' + r1( cx( seg[ 0 ] ) ) + ',' + base + 'L' + pts.join( 'L' ) + 'L' + r1( cx( seg[ seg.length - 1 ] ) ) + ',' + base + 'Z', 'class': 'ncs-chart__area t-' + ser.tone } );
					}
					if ( seg.length > 1 ) {
						c.add( 'path', { d: 'M' + pts.join( 'L' ), 'class': 'ncs-chart__line t-' + ser.tone } );
					}
					if ( dots || 1 === seg.length ) {
						seg.forEach( function ( p ) {
							c.add( 'circle', { cx: r1( cx( p ) ), cy: r1( y( ser.values[ p ] ) ), r: 1 === seg.length ? 3 : 2.5, 'class': 'ncs-chart__dot t-' + ser.tone } );
						} );
					}
					seg = [];
				};
				ser.values.forEach( function ( val, idx ) {
					if ( null === val ) {
						flush();
					} else {
						seg.push( idx );
					}
				} );
				flush();
			} );
		}

		gapLabels.forEach( function ( mid ) {
			c.add( 'rect', { x: r1( mid - labelW / 2 - 6 ), y: padT + 8, width: r1( labelW + 12 ), height: 18, 'class': 'ncs-chart__gap-chip' } );
			c.text( mid, padT + 21, NOT_YET, 'gap-label', 'middle' );
		} );

		// X labels, thinned so they never touch; the newest one always shows.
		var widest = 0;
		d.labels.forEach( function ( l ) {
			widest = Math.max( widest, c.measure( l, 'axis' ) );
		} );
		var every = Math.max( 1, Math.ceil( ( widest + 10 ) / colW ) );
		var edge = Infinity;
		for ( i = n - 1; i >= 0; i -= every ) {
			var half = c.measure( d.labels[ i ], 'axis' ) / 2;
			// Labels at the two ends are pulled inside the chart; skip one that would then touch its neighbour.
			var lx = Math.min( W - half, Math.max( half, cx( i ) ) );
			if ( lx + half > edge - 8 ) {
				continue;
			}
			edge = lx - half;
			c.text( lx, base + 17, d.labels[ i ], 'axis', 'middle' );
		}

		// One invisible column per period: the tooltip, the hover band and the arrow-key stop.
		for ( i = 0; i < n; i++ ) {
			var parts = S.map( function ( ser ) {
				return ( ns > 1 ? ser.name + ' ' : '' ) + full( ser.values[ i ], c.format );
			} );
			if ( stacked && ns > 1 ) {
				var t = 0;
				S.forEach( function ( ser ) {
					t += ser.values[ i ] || 0;
				} );
				parts.push( 'total ' + full( t, c.format ) );
			}
			var g = c.add( 'g', {} );
			c.add( 'rect', { x: r1( padL + colW * i ), y: padT, width: r1( colW ), height: plotH + padB, 'class': 'ncs-chart__hit' }, null, g );
			c.item( g, d.labels[ i ] + ': ' + parts.join( '; ' ) );
		}
		return base + padB;
	}

	/* ---------- Donut with a centre total and a legend with shares ---------- */

	function ring( cx, cy, ro, ri, a0, a1 ) {
		var pt = function ( r, a ) {
			return r1( cx + r * Math.cos( a ) ) + ',' + r1( cy + r * Math.sin( a ) );
		};
		var big = a1 - a0 > Math.PI ? 1 : 0;
		return 'M' + pt( ro, a0 ) + 'A' + ro + ',' + ro + ' 0 ' + big + ' 1 ' + pt( ro, a1 ) + 'L' + pt( ri, a1 ) + 'A' + ri + ',' + ri + ' 0 ' + big + ' 0 ' + pt( ri, a0 ) + 'Z';
	}

	function drawDonut( c ) {
		var d = c.st.data, W = c.W;
		var vals = d.series.length ? d.series[ 0 ].values : [];
		var rows = [], untracked = [];
		d.labels.forEach( function ( l, i ) {
			if ( null === vals[ i ] ) {
				untracked.push( { name: l, value: null } );
			} else if ( vals[ i ] > 0 ) {
				rows.push( { name: l, value: vals[ i ] } );
			}
		} );
		// More than eight slices is unreadable: keep the first seven and fold the rest into "Other".
		// A compact chart keeps as many rows as fit its height.
		// A compact chart fills its box: the ring as tall as the box, the list beside it, both in the middle.
		var compact = c.st.compact, Ht = compact ? ( c.st.plotH || compactH( W ) ) : 0;
		var rowH = compact ? 22 : 26;
		var side = compact ? W >= 236 : W >= 520;
		var ringMax = compact && ! side ? Math.max( 28, Math.min( 52, Math.floor( Ht * 0.24 ) ) ) : 0; // ring over list
		var most = compact ? Math.max( 2, Math.min( 8, Math.floor( ( side ? Ht : Ht - ringMax * 2 - 10 ) / rowH ) - untracked.length ) ) : 8;
		if ( rows.length > most ) {
			var rest = rows.slice( most - 1 ).reduce( function ( a, r ) {
				return a + r.value;
			}, 0 );
			rows = rows.slice( 0, most - 1 ).concat( [ { name: 'Other', value: rest } ] );
		}
		var total = rows.reduce( function ( a, r ) {
			return a + r.value;
		}, 0 );
		var all = rows.concat( untracked );
		var R = Math.min( 100, Math.floor( ( W - 8 ) / 2 ) );
		if ( compact ) {
			R = side ? Math.max( 40, Math.min( Math.floor( Ht / 2 ) - 2, Math.floor( W * 0.21 ) ) ) : Math.min( ringMax, Math.floor( ( W - 8 ) / 2 ) );
		}
		var ri = Math.round( R * 0.64 );
		var listH = all.length * rowH;
		var cx = side ? R : W / 2, cy = side ? Math.max( R, listH / 2 ) : R;
		var lx = side ? R * 2 + ( compact ? 18 : 36 ) : 0;
		var lw = Math.min( W - lx, 460 );
		var ly = side ? cy - listH / 2 : R * 2 + ( compact ? 10 : 18 );
		if ( compact ) {
			var usedH = side ? Math.max( R * 2, listH ) : R * 2 + 10 + listH;
			var dy = Math.max( 0, ( Ht - usedH ) / 2 ), dx = side ? Math.max( 0, Math.floor( ( W - lx - lw ) / 2 ) ) : 0;
			cx += dx;
			lx += dx;
			cy += dy;
			ly += dy;
		}
		var shareW = compact ? 36 : 44, valW = 0;
		all.forEach( function ( r ) {
			valW = Math.max( valW, c.measure( full( r.value, c.format ), null === r.value ? 'gap' : 'val' ) );
		} );
		// A narrow compact list keeps the name and the share; the number itself is in the reading and the table.
		var showVal = ! compact || lw - 16 - valW - shareW - 14 >= 84;
		if ( ! showVal ) {
			valW = 0;
		}

		if ( ! total ) {
			c.add( 'path', { d: ring( cx, cy, R, ri, -Math.PI / 2, Math.PI / 2 ) + ring( cx, cy, R, ri, Math.PI / 2, Math.PI * 1.5 ), fill: c.hatch(), 'class': 'ncs-chart__gap' } );
		}
		var a = -Math.PI / 2;
		all.forEach( function ( r, i ) {
			var g = c.add( 'g', {} );
			var share = total && null !== r.value ? r.value / total : 0;
			var tone = CYCLE[ i % CYCLE.length ];
			if ( share > 0 ) {
				var a1 = a + share * Math.PI * 2;
				var path = share > 0.9999 ?
					ring( cx, cy, R, ri, a, a + Math.PI ) + ring( cx, cy, R, ri, a + Math.PI, a + Math.PI * 2 ) :
					ring( cx, cy, R, ri, a, a1 );
				c.add( 'path', { d: path, 'class': 'ncs-chart__slice t-' + tone }, null, g );
				a = a1;
			}
			var top = ly + i * rowH;
			c.add( 'rect', { x: lx, y: r1( top ), width: lw, height: rowH, 'class': 'ncs-chart__hit' }, null, g );
			var sy = top + ( rowH - 10 ) / 2, ty = top + rowH / 2 + 4.5;
			if ( null === r.value ) {
				c.add( 'rect', { x: lx, y: r1( sy ), width: 10, height: 10, fill: c.hatch(), 'class': 'ncs-chart__gap' }, null, g );
			} else {
				c.add( 'rect', { x: lx, y: r1( sy ), width: 10, height: 10, 'class': 'ncs-chart__sw t-' + tone }, null, g );
			}
			var nameW = lw - 16 - valW - shareW - ( showVal ? 14 : 6 );
			c.text( lx + 16, ty, c.fit( r.name, 'key', nameW ), 'key', 'start', g );
			if ( null === r.value ) {
				c.text( lx + lw, ty, NOT_YET, 'gap-label', 'end', g );
			} else {
				if ( showVal ) {
					c.text( lx + lw - shareW, ty, full( r.value, c.format ), 'val', 'end', g );
				}
				c.text( lx + lw, ty, shareText( share ), 'axis', 'end', g );
			}
			c.add( 'line', { x1: lx, x2: lx + lw, y1: r1( top + rowH ), y2: r1( top + rowH ), 'class': 'ncs-chart__grid' }, null, g );
			c.item( g, r.name + ': ' + full( r.value, c.format ) + ( null === r.value ? '' : ', ' + shareText( share ) + ' of the total' ) );
		} );

		// Centre total; falls back to the short form when the full number will not fit the hole.
		var label = full( total, c.format );
		if ( c.measure( label, 'total' ) > ri * 2 - 14 ) {
			label = tick( total, c.format );
		}
		if ( c.measure( label, 'total' ) > ri * 2 - 8 ) {
			// A small ring: the short number in the smaller type.
			c.text( cx, cy + 4, label, 'val', 'middle' );
		} else {
			c.text( cx, cy + 4, label, 'total', 'middle' );
			c.text( cx, cy + 22, 'total', 'axis', 'middle' );
		}
		if ( compact ) {
			return Math.max( Ht, side ? Math.max( R * 2, listH ) : R * 2 + 10 + listH );
		}
		return side ? Math.max( R * 2, listH ) + 2 : R * 2 + 18 + listH + 2;
	}

	/* ---------- Ranked horizontal bars ---------- */

	function drawRank( c ) {
		var d = c.st.data, W = c.W, S = d.series, ns = Math.max( 1, S.length );
		var first = S.length ? S[ 0 ].values : [];
		var order = d.labels.map( function ( l, i ) {
			return i;
		} ).sort( function ( a, b ) {
			var va = first[ a ], vb = first[ b ];
			if ( null === va || null === vb ) {
				return ( null === va ? 1 : 0 ) - ( null === vb ? 1 : 0 ) || a - b;
			}
			return vb - va || a - b;
		} );
		var given = 'given' === c.st.spec.order; // rows that have an order of their own (periods of time)
		if ( given ) {
			order = d.labels.map( function ( l, i ) {
				return i;
			} );
		}
		var compact = c.st.compact;
		var wide = compact ? W >= 300 : W >= 520;
		var barH = ns > 1 ? 10 : 12, barsH = ns * barH + ( ns - 1 ) * 3;
		var rowH = ( wide ? 0 : 20 ) + barsH + ( compact ? 8 : 16 );
		// A compact chart shows the rows that fit its height, spread to fill it; the table and the larger view
		// have the rest.
		var Ht = compact ? ( c.st.plotH || compactH( W ) ) : 0, footH = 0;
		var shown = order.slice( 0, 15 );
		if ( compact ) {
			if ( order.length * rowH > Ht - 2 ) {
				footH = 20;
				shown = order.slice( 0, Math.max( 2, Math.floor( ( Ht - 2 - footH ) / rowH ) ) );
			}
			rowH = Math.max( rowH, Math.min( rowH + 22, ( Ht - 2 - footH ) / Math.max( 1, shown.length ) ) );
		}
		var max = 0, valW = c.measure( NOT_YET, 'gap' ) * ( shown.some( function ( i ) {
			return S.some( function ( s ) {
				return null === s.values[ i ];
			} );
		} ) ? 1 : 0 );
		var nameW = 0;
		shown.forEach( function ( i ) {
			nameW = Math.max( nameW, c.measure( d.labels[ i ], 'name' ) );
			S.forEach( function ( s ) {
				if ( null !== s.values[ i ] ) {
					max = Math.max( max, s.values[ i ] );
					valW = Math.max( valW, c.measure( full( s.values[ i ], c.format ), 'val' ) );
				}
			} );
		} );
		max = max || 1;

		var keys = S.length > 1 ? S.map( function ( s ) {
			return { name: s.name, cls: 't-' + s.tone };
		} ) : [];
		var y = legend( c, keys, 0 );
		var colName = wide ? Math.min( Math.ceil( nameW ), Math.round( W * ( compact ? 0.46 : 0.38 ) ) ) : W;
		var x0 = wide ? colName + ( compact ? 10 : 14 ) : 0;
		var gapTrack = 36;
		var barMax = Math.max( 20, W - x0 - valW - 8 );

		c.add( 'line', { x1: 0, x2: W, y1: r1( y + 0.5 ), y2: r1( y + 0.5 ), 'class': 'ncs-chart__base' } );
		shown.forEach( function ( i, row ) {
			var top = y + row * rowH;
			var g = c.add( 'g', {} );
			c.add( 'rect', { x: 0, y: r1( top ), width: W, height: r1( rowH ), 'class': 'ncs-chart__hit' }, null, g );
			var by = compact ? top + ( wide ? 0 : 20 ) + ( rowH - ( wide ? 0 : 20 ) - barsH ) / 2 : top + 8 + ( wide ? 0 : 20 );
			c.text( 0, wide ? by + barsH / 2 + 4.5 : top + 19, c.fit( d.labels[ i ], 'name', colName ), 'name', 'start', g );
			var tips = [];
			S.forEach( function ( s, k ) {
				var v = s.values[ i ], yy = by + k * ( barH + 3 );
				tips.push( ( S.length > 1 ? s.name + ' ' : '' ) + full( v, c.format ) );
				if ( null === v ) {
					c.add( 'rect', { x: x0, y: r1( yy ), width: gapTrack, height: barH, fill: c.hatch(), 'class': 'ncs-chart__gap' }, null, g );
					c.text( x0 + gapTrack + 6, yy + barH - 1.5, NOT_YET, 'gap-label', 'start', g );
					return;
				}
				var w = Math.max( v > 0 ? 1 : 0, barMax * v / max );
				c.add( 'rect', { x: x0, y: r1( yy ), width: r1( w ), height: barH, 'class': 'ncs-chart__bar t-' + s.tone }, null, g );
				c.text( x0 + w + 6, yy + barH - 1.5, full( v, c.format ), 'val', 'start', g );
			} );
			c.add( 'line', { x1: 0, x2: W, y1: r1( top + rowH + 0.5 ), y2: r1( top + rowH + 0.5 ), 'class': 'ncs-chart__grid' }, null, g );
			c.item( g, ( given ? '' : ( row + 1 ) + '. ' ) + d.labels[ i ] + ': ' + tips.join( '; ' ) );
		} );
		var H = y + shown.length * rowH + 2;
		if ( order.length > shown.length ) {
			c.text( 0, compact ? Math.max( H + 14, Ht - 5 ) : H + 16, c.fit( 'Showing the top ' + shown.length + ' of ' + F.whole.format( order.length ) + '. The table has them all.', 'axis', W ), 'axis' );
			H += compact ? footH : 24;
		}
		return compact ? Math.max( Ht, H ) : H;
	}

	/* ---------- US states as square tiles ---------- */

	// Up to five bands with about the same number of states in each; band 5 is always the darkest.
	function bands( values ) {
		var sorted = values.filter( function ( v ) {
			return v > 0;
		} ).sort( function ( a, b ) {
			return a - b;
		} );
		var ends = [];
		for ( var k = 1; k <= 5 && sorted.length; k++ ) {
			var e = sorted[ Math.max( 0, Math.ceil( sorted.length * k / 5 ) - 1 ) ];
			if ( ! ends.length || e > ends[ ends.length - 1 ] ) {
				ends.push( e );
			}
		}
		return { min: sorted[ 0 ], ends: ends };
	}

	function drawTiles( c ) {
		var W = c.W, states = c.st.data.states || {};
		var b = bands( Object.keys( states ).map( function ( k ) {
			return states[ k ];
		} ) );
		var nb = b.ends.length;
		var stepOf = function ( v ) {
			if ( ! ( v > 0 ) ) {
				return 0;
			}
			for ( var i = 0; i < nb; i++ ) {
				if ( v <= b.ends[ i ] ) {
					return Math.round( ( i + 1 ) * 5 / nb );
				}
			}
			return 5;
		};
		var gap = W >= 420 ? 4 : 2;
		var size = Math.min( 54, Math.floor( ( W - gap * 10 ) / 11 ) );
		var left = 0, down = 0, Ht = c.st.compact ? ( c.st.plotH || compactH( W ) - 38 ) : 0;
		if ( c.st.compact ) {
			// The map takes the height of its box and sits in the middle of it; its key is above the drawing.
			if ( Math.floor( ( Ht - gap * 7 ) / 8 ) < 22 ) {
				gap = 2;
			}
			size = Math.max( 12, Math.min( size, Math.floor( ( Ht - gap * 7 ) / 8 ) ) );
			left = Math.max( 0, Math.floor( ( W - ( size * 11 + gap * 10 ) ) / 2 ) );
			down = Math.max( 0, Math.floor( ( Ht - ( size * 8 + gap * 7 ) ) / 2 ) );
		}
		var small = size < 26, roomy = size >= 44;
		TILES.forEach( function ( t ) {
			var v = states[ t[ 0 ] ], step = stepOf( v );
			var x = left + t[ 1 ] * ( size + gap ), y = down + t[ 2 ] * ( size + gap );
			var g = c.add( 'g', {} );
			c.add( 'rect', { x: x, y: y, width: size, height: size, 'class': 'ncs-chart__tile s-' + step }, null, g );
			var dark = step >= 4 ? ' is-dark' : '';
			c.text( x + size / 2, y + size / 2 + ( roomy && step ? -2 : 4 ), t[ 0 ], 'tile-code' + ( small ? ' is-small' : '' ) + dark, 'middle', g );
			if ( roomy && step ) {
				c.text( x + size / 2, y + size / 2 + 12, tick( v, c.format ), 'tile-val' + dark, 'middle', g );
			}
			c.item( g, t[ 3 ] + ': ' + ( v > 0 ? full( v, c.format ) : 'none' ) );
		} );

		// Legend: "None" first, then each band with the numbers it covers.
		var whole = Object.keys( states ).every( function ( k ) {
			return states[ k ] === Math.round( states[ k ] );
		} );
		var keys = [ { name: 'None', cls: 'ncs-chart__tile s-0' } ];
		b.ends.forEach( function ( e, i ) {
			var lo = i ? ( whole ? b.ends[ i - 1 ] + 1 : null ) : b.min;
			var name = null === lo ? 'up to ' + full( e, c.format ) : ( lo === e ? full( e, c.format ) : full( lo, c.format ) + ' to ' + full( e, c.format ) );
			keys.push( { name: name, cls: 'ncs-chart__tile s-' + Math.round( ( i + 1 ) * 5 / nb ) } );
		} );
		var top = 8 * size + 7 * gap + 12;
		var keyH = legend( c, keys, top );
		return c.st.compact ? Math.max( Ht, 8 * size + 7 * gap ) : top + keyH;
	}

	/* ---------- Build one SVG at a given width ---------- */

	function build( st, W ) {
		var c = context( st, W );
		var draw = { donut: drawDonut, rank: drawRank, tilemap: drawTiles }[ st.type ] || drawXY;
		var H = Math.ceil( draw( c ) );
		c.H = H;
		c.svg.setAttribute( 'viewBox', '0 0 ' + W + ' ' + H );
		c.svg.setAttribute( 'aria-label', summary( st ) );
		return c;
	}

	// One or two sentences that say what the chart shows, for screen readers.
	function summary( st ) {
		var d = st.data, f = st.spec.format || 'number', out = [ ( st.spec.title || 'Chart' ) + '.' ];
		var n = d.labels.length;
		if ( 'tilemap' === st.type || 'rank' === st.type || 'donut' === st.type ) {
			var vals = d.series.length ? d.series[ 0 ].values : [];
			var idx = d.labels.map( function ( l, i ) {
				return i;
			} ).filter( function ( i ) {
				return null !== vals[ i ];
			} ).sort( function ( a, b ) {
				return vals[ b ] - vals[ a ];
			} );
			var total = idx.reduce( function ( a, i ) {
				return a + vals[ i ];
			}, 0 );
			out.push( KIND[ st.type ] + ' of ' + n + ( 1 === n ? ' row.' : ' rows.' ) );
			if ( 'donut' === st.type ) {
				out.push( 'Total ' + full( total, f ) + '.' );
			}
			if ( idx.length ) {
				out.push( 'Largest: ' + idx.slice( 0, 3 ).map( function ( i ) {
					return d.labels[ i ] + ' ' + full( vals[ i ], f );
				} ).join( ', ' ) + '.' );
			}
		} else {
			out.push( KIND[ st.type ] + ( n ? ', ' + d.labels[ 0 ] + ' to ' + d.labels[ n - 1 ] + '.' : '.' ) );
			d.series.slice( 0, 4 ).forEach( function ( s ) {
				var hi = -1, gaps = 0;
				s.values.forEach( function ( v, i ) {
					if ( null === v ) {
						gaps++;
					} else if ( hi < 0 || v > s.values[ hi ] ) {
						hi = i;
					}
				} );
				var last = s.values[ n - 1 ];
				out.push( s.name + ': ' + ( hi < 0 ? NOT_YET : 'highest ' + full( s.values[ hi ], f ) + ' in ' + d.labels[ hi ] +
					( null !== last && undefined !== last ? ', latest ' + full( last, f ) : '' ) +
					( gaps ? ', ' + NOT_YET + ' for ' + gaps + ' of ' + n : '' ) ) + '.' );
			} );
		}
		return out.join( ' ' );
	}

	/* ---------- Table and tab-separated numbers ---------- */

	function tableData( st ) {
		var d = st.data, donut = 'donut' === st.type && d.series.length;
		var head = [ d.rowHead ].concat( d.series.map( function ( s ) {
			return s.name;
		} ) );
		var total = 0;
		if ( donut ) {
			head.push( 'Share' );
			d.series[ 0 ].values.forEach( function ( v ) {
				total += v || 0;
			} );
		}
		var rows = d.labels.map( function ( l, i ) {
			var row = [ l ].concat( d.series.map( function ( s ) {
				return s.values[ i ];
			} ) );
			if ( donut ) {
				var v = d.series[ 0 ].values[ i ];
				row.push( null === v || ! total ? '' : F.pct.format( v / total ) );
			}
			return row;
		} );
		return { head: head, rows: rows, cols: d.series.length };
	}

	function buildTable( st ) {
		var t = tableData( st ), f = st.spec.format || 'number';
		var table = el( 'table', 'ncs-chart__table' );
		table.appendChild( el( 'caption', 'ncs-chart__sr', st.spec.title || 'Chart numbers' ) );
		var tr = table.appendChild( el( 'thead' ) ).appendChild( el( 'tr' ) );
		t.head.forEach( function ( h ) {
			tr.appendChild( el( 'th', '', h ) ).setAttribute( 'scope', 'col' );
		} );
		var body = table.appendChild( el( 'tbody' ) );
		t.rows.forEach( function ( row ) {
			var r = body.appendChild( el( 'tr' ) );
			row.forEach( function ( cell, i ) {
				if ( ! i ) {
					r.appendChild( el( 'th', '', cell ) ).setAttribute( 'scope', 'row' );
				} else if ( i <= t.cols ) {
					r.appendChild( el( 'td', null === cell ? 'is-gap' : '', full( cell, f ) ) );
				} else {
					r.appendChild( el( 'td', '', cell ) );
				}
			} );
		} );
		return table;
	}

	// Plain numbers for Excel: no $ or commas; percents as 12.3%; an untracked cell is left empty.
	function tsv( st ) {
		var t = tableData( st ), pct = 'percent' === st.spec.format;
		var clean = function ( s ) {
			return String( s ).replace( /[\t\r\n]+/g, ' ' );
		};
		return [ t.head.map( clean ).join( '\t' ) ].concat( t.rows.map( function ( row ) {
			return row.map( function ( cell, i ) {
				if ( null === cell ) {
					return '';
				}
				if ( i && i <= t.cols ) {
					return pct ? F.pct.format( cell ).replace( /,/g, '' ) : String( cell );
				}
				return clean( cell );
			} ).join( '\t' );
		} ) ).join( '\n' );
	}

	function copyText( text ) {
		var old = function () {
			var ta = document.createElement( 'textarea' );
			ta.value = text;
			ta.setAttribute( 'readonly', '' );
			ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
			document.body.appendChild( ta );
			ta.select();
			var ok = false;
			try {
				ok = document.execCommand( 'copy' );
			} catch ( e ) {}
			ta.remove();
			return ok;
		};
		if ( navigator.clipboard && navigator.clipboard.writeText ) {
			return navigator.clipboard.writeText( text ).then( function () {
				return true;
			}, old );
		}
		return Promise.resolve( old() );
	}

	/* ---------- Save picture: PNG at 2x on white, with the title and the note ---------- */

	function wrap( ctx, str, maxW ) {
		var lines = [], line = '';
		String( str ).split( /\s+/ ).forEach( function ( word ) {
			var next = line ? line + ' ' + word : word;
			if ( line && ctx.measureText( next ).width > maxW ) {
				lines.push( line );
				line = word;
			} else {
				line = next;
			}
		} );
		if ( line ) {
			lines.push( line );
		}
		return lines;
	}

	function toPng( fig ) {
		var st = fig && fig._ncsChart;
		if ( ! st ) {
			return Promise.reject( new Error( 'No chart in this figure.' ) );
		}
		var W = 960, pad = 36, scale = 2;
		// Draw a fresh copy at slide width, off screen but inside the figure so the same CSS applies.
		var host = el( 'div', 'ncs-chart__offscreen' );
		host.style.width = W + 'px';
		fig.appendChild( host );
		var whole = Object.create( st ); // the picture is always the full form, never the compact one
		whole.compact = false;
		var c = build( whole, W );
		host.appendChild( c.svg );
		var root = getComputedStyle( fig );
		var token = function ( name, fallback ) {
			return root.getPropertyValue( name ).trim() || fallback;
		};
		// The picture cannot see the page's CSS or fonts. Shapes get their computed colours written in;
		// text is taken out and drawn on the canvas, where the page's own fonts are available.
		var texts = [];
		Array.prototype.forEach.call( c.svg.querySelectorAll( '*' ), function ( n ) {
			var tag = n.tagName.toLowerCase();
			if ( /^(g|defs|pattern|title)$/.test( tag ) ) {
				return;
			}
			var cs = getComputedStyle( n );
			if ( 'text' === tag ) {
				texts.push( {
					x: parseFloat( n.getAttribute( 'x' ) ), y: parseFloat( n.getAttribute( 'y' ) ),
					anchor: n.getAttribute( 'text-anchor' ), str: n.textContent,
					font: cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily,
					fill: cs.fill, alpha: parseFloat( cs.fillOpacity ) * parseFloat( cs.opacity )
				} );
				return;
			}
			var css = 'fill-opacity:' + cs.fillOpacity + ';stroke:' + cs.stroke + ';stroke-width:' + cs.strokeWidth +
				';stroke-opacity:' + cs.strokeOpacity + ';stroke-linejoin:' + cs.strokeLinejoin + ';stroke-linecap:' + cs.strokeLinecap + ';opacity:' + cs.opacity;
			if ( ! /^url/.test( n.getAttribute( 'fill' ) || '' ) ) {
				css += ';fill:' + cs.fill;
			}
			n.setAttribute( 'style', css );
		} );
		Array.prototype.forEach.call( c.svg.querySelectorAll( 'text, title' ), function ( n ) {
			n.remove();
		} );
		c.svg.setAttribute( 'width', W );
		c.svg.setAttribute( 'height', c.H );
		c.svg.removeAttribute( 'tabindex' );
		var xml = new XMLSerializer().serializeToString( c.svg );
		host.remove();

		var titleFont = '600 30px ' + st.serif, noteFont = '400 15px ' + st.sans;
		var fonts = [ titleFont, noteFont ];
		texts.forEach( function ( t ) {
			if ( fonts.indexOf( t.font ) < 0 ) {
				fonts.push( t.font );
			}
		} );
		var ready = document.fonts && document.fonts.load ? Promise.all( fonts.map( function ( f ) {
			return document.fonts.load( f ).catch( function () {} );
		} ) ) : Promise.resolve();

		return ready.then( function () {
			return new Promise( function ( resolve, reject ) {
				var img = new Image();
				img.onload = function () {
					var canvas = document.createElement( 'canvas' );
					var ctx = canvas.getContext( '2d' );
					ctx.font = titleFont;
					var title = st.spec.title ? wrap( ctx, st.spec.title, W ) : [];
					ctx.font = noteFont;
					var note = st.spec.note ? wrap( ctx, st.spec.note, W ) : [];
					var titleH = title.length * 38, noteH = note.length ? 16 + note.length * 22 : 0;
					var top = pad + titleH + ( title.length ? 18 : 0 );
					canvas.width = ( W + pad * 2 ) * scale;
					canvas.height = ( top + c.H + noteH + pad ) * scale;
					ctx.scale( scale, scale );
					ctx.fillStyle = token( '--ncs-chart-paper', 'white' );
					ctx.fillRect( 0, 0, W + pad * 2, top + c.H + noteH + pad );
					ctx.textBaseline = 'alphabetic';
					ctx.fillStyle = token( '--ncs-chart-navy', 'black' );
					ctx.font = titleFont;
					title.forEach( function ( line, i ) {
						ctx.fillText( line, pad, pad + 29 + i * 38 );
					} );
					ctx.drawImage( img, pad, top, W, c.H );
					texts.forEach( function ( t ) {
						ctx.font = t.font;
						ctx.fillStyle = t.fill;
						ctx.globalAlpha = isFinite( t.alpha ) ? t.alpha : 1;
						ctx.textAlign = 'middle' === t.anchor ? 'center' : ( 'end' === t.anchor ? 'right' : 'left' );
						ctx.fillText( t.str, pad + t.x, top + t.y );
					} );
					ctx.globalAlpha = 1;
					ctx.textAlign = 'left';
					ctx.fillStyle = token( '--ncs-chart-muted', 'black' );
					ctx.font = noteFont;
					note.forEach( function ( line, i ) {
						ctx.fillText( line, pad, top + c.H + 16 + 16 + i * 22 );
					} );
					canvas.toBlob( function ( blob ) {
						if ( blob ) {
							resolve( blob );
						} else {
							reject( new Error( 'The picture could not be made.' ) );
						}
					}, 'image/png' );
				};
				img.onerror = function () {
					reject( new Error( 'The picture could not be made.' ) );
				};
				img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent( xml );
			} );
		} );
	}

	function slug( s ) {
		return String( s || 'chart' ).toLowerCase().replace( /[^a-z0-9]+/g, '-' ).replace( /^-+|-+$/g, '' ) || 'chart';
	}

	/* ---------- A compact chart at full size, in a dialog ---------- */

	// The dialog is modal: the browser keeps the focus inside it, Escape closes it, and the focus goes back to
	// the button that opened it. Without <dialog> the chart is drawn again in place in its full form.
	function enlarge( fig, st, opener ) {
		var spec = {};
		Object.keys( st.spec ).forEach( function ( k ) {
			spec[ k ] = st.spec[ k ];
		} );
		spec.compact = false;
		spec.type = st.type;
		if ( ! window.HTMLDialogElement ) {
			render( fig, spec );
			return;
		}
		var d = el( 'dialog', 'ncs-chart-dialog' );
		d.setAttribute( 'aria-label', 'Larger view' + ( spec.title ? ': ' + spec.title : '' ) );
		var bar = d.appendChild( el( 'div', 'ncs-chart-dialog__bar' ) );
		var close = bar.appendChild( el( 'button', 'ncs-chart__btn', 'Close' ) );
		close.type = 'button';
		close.setAttribute( 'data-act', 'close' );
		var big = d.appendChild( el( 'figure', 'ncs-chart-dialog__fig' ) );
		( fig.closest( '[data-ncs-board]' ) || document.body ).appendChild( d ); // inside the element that holds the colours
		close.addEventListener( 'click', function () {
			d.close();
		} );
		d.addEventListener( 'mousedown', function ( e ) {
			if ( e.target === d ) {
				d.close(); // a click on the dimmed page around it
			}
		} );
		d.addEventListener( 'close', function () {
			if ( big._ncsChart && big._ncsChart.ro ) {
				big._ncsChart.ro.disconnect();
			}
			d.remove();
			if ( opener && opener.focus ) {
				opener.focus();
			}
		} );
		d.showModal();
		render( big, spec );
	}

	/* ---------- The figure: caption, toolbar, chart, readout, table, note ---------- */

	function render( fig, spec ) {
		if ( ! fig || ! spec ) {
			return;
		}
		var old = fig._ncsChart;
		if ( old && old.ro ) {
			old.ro.disconnect();
		}
		Array.prototype.slice.call( fig.querySelectorAll( '[data-ncsc]' ) ).forEach( function ( n ) {
			n.remove();
		} );
		fig.classList.add( 'ncs-chart' );

		F = formatsFor( spec );
		var cs = getComputedStyle( fig );
		var type = TYPES[ spec.type ] ? spec.type : 'bar';
		var types = ( spec.types || [] ).filter( function ( t, i, a ) {
			return TYPES[ t ] && a.indexOf( t ) === i;
		} );
		if ( types.length && types.indexOf( type ) < 0 ) {
			types.unshift( type );
		}
		var compact = undefined !== spec.compact && null !== spec.compact ? !! spec.compact : fig.hasAttribute( 'data-compact' );
		fig.classList.toggle( 'is-compact', compact );
		var st = fig._ncsChart = {
			fig: fig, spec: spec, type: type, data: normalise( spec ), table: false, active: -1, items: [], width: 0, compact: compact,
			sans: cs.getPropertyValue( '--ncs-chart-sans' ).trim() || 'sans-serif',
			serif: cs.getPropertyValue( '--ncs-chart-serif' ).trim() || 'serif'
		};

		var caption = fig.appendChild( el( 'figcaption', 'ncs-chart__title', spec.title || '' ) );
		var tools = fig.appendChild( el( 'div', 'ncs-chart__tools' ) );
		tools.setAttribute( 'role', 'group' );
		tools.setAttribute( 'aria-label', 'Chart tools' + ( spec.title ? ': ' + spec.title : '' ) );
		var keyEl = fig.appendChild( el( 'div', 'ncs-chart__legend' ) ); // the compact form's colour key
		keyEl.hidden = true;
		var plot = fig.appendChild( el( 'div', 'ncs-chart__plot' ) );
		var readout = fig.appendChild( el( 'p', 'ncs-chart__readout', HINT ) );
		readout.setAttribute( 'aria-live', 'polite' );
		var tableWrap = fig.appendChild( el( 'div', 'ncs-chart__table-wrap' ) );
		tableWrap.hidden = true;
		tableWrap.setAttribute( 'tabindex', '0' );
		tableWrap.setAttribute( 'role', 'region' );
		tableWrap.setAttribute( 'aria-label', 'Table: ' + ( spec.title || 'chart numbers' ) );
		if ( spec.note ) {
			var noteEl = fig.appendChild( el( 'p', 'ncs-chart__note', spec.note ) );
			if ( compact ) {
				noteEl.title = spec.note; // cut to two lines on screen; whole here, in the larger view and in print
			}
		}
		if ( ! spec.title ) {
			caption.hidden = true;
		}

		var button = function ( label, parent ) {
			var b = ( parent || tools ).appendChild( el( 'button', 'ncs-chart__btn', label ) );
			b.type = 'button';
			return b;
		};

		var setActive = function ( i ) {
			st.items.forEach( function ( it, k ) {
				it.el.classList.toggle( 'is-active', k === i );
			} );
			st.active = i;
			if ( st.svg ) {
				st.svg.classList.toggle( 'has-active', i >= 0 );
			}
			readout.textContent = i >= 0 && st.items[ i ] ? st.items[ i ].tip : ( compact ? '' : HINT );
			readout.classList.toggle( 'is-on', i >= 0 );
		};

		// The height the page asks for (--ncs-chart-plot-h on the figure sets the plot's CSS height), or 0.
		var askedH = function () {
			return compact && getComputedStyle( fig ).getPropertyValue( '--ncs-chart-plot-h' ).trim() ? Math.round( plot.clientHeight ) : 0;
		};
		// The compact form's key: a swatch and a name each, two lines at most. A key that needs more is set in
		// even columns and its names are cut with an ellipsis (whole in the title, the reading and the table).
		var drawKey = function ( c ) {
			var keys = compact ? ( c.keys || [] ) : [];
			keyEl.textContent = '';
			keyEl.classList.remove( 'is-tight' );
			keyEl.hidden = ! keys.length;
			keys.forEach( function ( k ) {
				var item = keyEl.appendChild( el( 'span', 'ncs-chart__legend-key' ) );
				item.title = k.name;
				var sw = item.appendChild( mk( 'svg', { 'class': 'ncs-chart__legend-sw', width: 10, height: 10, viewBox: '0 0 10 10', 'aria-hidden': 'true', focusable: 'false' } ) );
				sw.appendChild( mk( 'rect', k.hatch ? { width: 10, height: 10, fill: c.hatch(), 'class': 'ncs-chart__gap' } : { width: 10, height: 10, 'class': ( /^ncs-chart__tile/.test( k.cls ) ? '' : 'ncs-chart__sw ' ) + k.cls } ) );
				item.appendChild( el( 'span', 'ncs-chart__legend-name', k.name ) );
			} );
			if ( keys.length > 2 && keyEl.scrollHeight > keyEl.clientHeight + 1 ) {
				keyEl.style.setProperty( '--ncs-chart-key-cols', Math.ceil( keys.length / 2 ) );
				keyEl.classList.add( 'is-tight' );
			}
		};
		var draw = function () {
			F = formatsFor( st.spec );
			var W = Math.max( 220, Math.floor( plot.clientWidth ) || 640 );
			st.width = W;
			st.plotH = askedH();
			fig.classList.toggle( 'is-narrow', compact && fig.clientWidth > 0 && fig.clientWidth < 300 );
			var c = build( st, W );
			st.svg = c.svg;
			st.items = c.items;
			plot.textContent = '';
			plot.appendChild( c.svg );
			drawKey( c );
			setActive( -1 );
			c.items.forEach( function ( it, i ) {
				it.el.addEventListener( 'mouseenter', function () {
					setActive( i );
				} );
				it.el.addEventListener( 'click', function () {
					setActive( i );
				} );
			} );
			c.svg.addEventListener( 'mouseleave', function () {
				if ( document.activeElement !== c.svg ) {
					setActive( -1 );
				}
			} );
			c.svg.addEventListener( 'focus', function () {
				if ( st.active < 0 && st.items.length ) {
					setActive( 0 );
				}
			} );
			c.svg.addEventListener( 'blur', function () {
				setActive( -1 );
			} );
			c.svg.addEventListener( 'keydown', function ( e ) {
				var n = st.items.length, i = st.active;
				if ( ! n ) {
					return;
				}
				if ( 'ArrowRight' === e.key || 'ArrowDown' === e.key ) {
					i = Math.min( n - 1, i + 1 );
				} else if ( 'ArrowLeft' === e.key || 'ArrowUp' === e.key ) {
					i = Math.max( 0, i - 1 );
				} else if ( 'Home' === e.key ) {
					i = 0;
				} else if ( 'End' === e.key ) {
					i = n - 1;
				} else {
					return;
				}
				e.preventDefault();
				setActive( i );
			} );
		};

		// Toolbar: chart types (when there is a choice), Table, Save picture, Copy numbers.
		var group = null;
		var setType = function ( t ) {
			st.type = t;
			Array.prototype.forEach.call( group.children, function ( x ) {
				x.setAttribute( 'aria-pressed', x.getAttribute( 'data-type' ) === t ? 'true' : 'false' );
			} );
			if ( st.table ) {
				showTable( false );
			} else {
				draw();
			}
		};
		if ( types.length > 1 ) {
			group = tools.appendChild( el( 'span', 'ncs-chart__types' ) );
			types.forEach( function ( t ) {
				var b = button( TYPES[ t ], group );
				b.setAttribute( 'data-type', t );
				b.setAttribute( 'aria-pressed', t === st.type ? 'true' : 'false' );
				b.addEventListener( 'click', function () {
					setType( t );
				} );
			} );
		}
		// The compact form keeps these under one "More" button; the full form lays them out in a row.
		var moreBtn = null, menu = null, openMenu = function () {};
		if ( compact ) {
			moreBtn = button( 'More' );
			moreBtn.setAttribute( 'data-act', 'more' );
			moreBtn.setAttribute( 'data-label', 'More' );
			moreBtn.setAttribute( 'aria-haspopup', 'true' );
			moreBtn.setAttribute( 'aria-expanded', 'false' );
			menu = tools.appendChild( el( 'div', 'ncs-chart__menu' ) );
			menu.id = 'ncsc-menu-' + ( ++uid );
			menu.hidden = true;
			menu.setAttribute( 'role', 'menu' );
			menu.setAttribute( 'aria-label', 'More' + ( spec.title ? ': ' + spec.title : '' ) );
			moreBtn.setAttribute( 'aria-controls', menu.id );
			// The lines that are showing (the chart types are in the menu only when the figure is narrow).
			var menuList = function () {
				return Array.prototype.filter.call( menu.children, function ( b ) {
					return b.offsetParent !== null;
				} );
			};
			var outside = function ( e ) {
				if ( ! tools.contains( e.target ) ) {
					openMenu( false );
				}
			};
			openMenu = function ( on, focus ) {
				menu.hidden = ! on;
				moreBtn.setAttribute( 'aria-expanded', on ? 'true' : 'false' );
				fig.classList.toggle( 'has-menu', on );
				document[ on ? 'addEventListener' : 'removeEventListener' ]( 'mousedown', outside );
				if ( on && focus ) {
					var list = menuList();
					( 'last' === focus ? list[ list.length - 1 ] : list[ 0 ] ).focus();
				}
			};
			moreBtn.addEventListener( 'click', function () {
				openMenu( menu.hidden, 'first' );
			} );
			moreBtn.addEventListener( 'keydown', function ( e ) {
				if ( 'ArrowDown' === e.key || 'ArrowUp' === e.key ) {
					e.preventDefault();
					openMenu( true, 'ArrowUp' === e.key ? 'last' : 'first' );
				}
			} );
			menu.addEventListener( 'keydown', function ( e ) {
				var list = menuList(), at = list.indexOf( document.activeElement );
				if ( 'Escape' === e.key ) {
					e.preventDefault();
					e.stopPropagation();
					openMenu( false );
					moreBtn.focus();
				} else if ( 'ArrowDown' === e.key || 'ArrowUp' === e.key ) {
					e.preventDefault();
					list[ ( at + ( 'ArrowDown' === e.key ? 1 : list.length - 1 ) ) % list.length ].focus();
				} else if ( 'Home' === e.key || 'End' === e.key ) {
					e.preventDefault();
					list[ 'Home' === e.key ? 0 : list.length - 1 ].focus();
				} else if ( 'Tab' === e.key ) {
					openMenu( false );
				}
			} );
			tools.addEventListener( 'focusout', function ( e ) {
				if ( ! menu.hidden && e.relatedTarget && ! tools.contains( e.relatedTarget ) ) {
					openMenu( false );
				}
			} );
		}
		// One action: a button in the row, or a line in the More menu (which closes and takes the focus back).
		var action = function ( label, act, run ) {
			var b = compact ? menu.appendChild( el( 'button', 'ncs-chart__menu-item', label ) ) : button( label );
			b.type = 'button';
			b.setAttribute( 'data-act', act );
			b.setAttribute( 'data-label', label );
			if ( compact ) {
				b.setAttribute( 'role', 'menuitem' );
				b.setAttribute( 'tabindex', '-1' );
			}
			b.addEventListener( 'click', function () {
				if ( compact ) {
					openMenu( false );
					moreBtn.focus();
				}
				run( b );
			} );
			return b;
		};
		if ( compact ) {
			action( 'Enlarge', 'enlarge', function () {
				enlarge( fig, st, moreBtn );
			} );
			// A narrow figure has no room for the row of chart types, so the CSS shows them here instead.
			if ( group ) {
				types.forEach( function ( t ) {
					action( 'Show as: ' + TYPES[ t ].toLowerCase(), 'type-' + t, function () {
						setType( t );
					} ).classList.add( 'is-type' );
				} );
			}
		}
		var tableBtn = action( 'Table', 'table', function () {
			showTable( ! st.table );
		} );
		if ( ! compact ) {
			tableBtn.setAttribute( 'aria-pressed', 'false' );
		}
		var showTable = function ( on ) {
			st.table = on;
			if ( ! compact ) {
				tableBtn.setAttribute( 'aria-pressed', on ? 'true' : 'false' );
			}
			tableBtn.textContent = on ? 'Chart' : 'Table';
			plot.hidden = readout.hidden = on;
			if ( on ) {
				keyEl.hidden = true;
			}
			tableWrap.hidden = ! on;
			tableWrap.textContent = '';
			if ( on ) {
				tableWrap.appendChild( buildTable( st ) );
			} else {
				draw();
			}
		};
		var flash = function ( b, text ) {
			b = compact ? moreBtn : b; // the menu has closed, so the word shows on its button
			var was = b.getAttribute( 'data-label' );
			b.textContent = text;
			clearTimeout( b._t );
			b._t = setTimeout( function () {
				b.textContent = was;
			}, 1800 );
		};
		var saveBtn = action( 'Save picture', 'save', function () {
			toPng( fig ).then( function ( blob ) {
				var a = document.createElement( 'a' );
				a.href = URL.createObjectURL( blob );
				a.download = slug( spec.title ) + '.png';
				document.body.appendChild( a );
				a.click();
				a.remove();
				setTimeout( function () {
					URL.revokeObjectURL( a.href );
				}, 4000 );
				flash( saveBtn, 'Saved' );
			} ).catch( function () {
				flash( saveBtn, 'Could not save' );
			} );
		} );
		var copyBtn = action( 'Copy numbers', 'copy', function () {
			copyText( tsv( st ) ).then( function ( ok ) {
				flash( copyBtn, ok ? 'Copied' : 'Could not copy' );
			} );
		} );

		draw();

		// Draw again when the box changes width or the height asked for changes (a phone turned, a tab shown, the
		// menu folded, a grid that went from four across to two).
		if ( window.ResizeObserver ) {
			var pending = 0;
			st.ro = new ResizeObserver( function () {
				if ( pending || st.table ) {
					return;
				}
				pending = requestAnimationFrame( function () {
					pending = 0;
					var W = Math.max( 220, Math.floor( plot.clientWidth ) || 0 );
					if ( plot.clientWidth && ( W !== st.width || askedH() !== st.plotH ) ) {
						draw();
					}
				} );
			} );
			st.ro.observe( plot );
		}
		// Labels are measured with the page fonts, so measure again once they have loaded.
		if ( document.fonts && document.fonts.ready && 'loaded' !== document.fonts.status ) {
			document.fonts.ready.then( function () {
				if ( fig._ncsChart === st && ! st.table ) {
					draw();
				}
			} );
		}
	}

	function auto( root ) {
		Array.prototype.forEach.call( ( root || document ).querySelectorAll( '[data-chart]' ), function ( fig ) {
			var src = fig.querySelector( 'script[type="application/json"]' );
			if ( ! src ) {
				return;
			}
			try {
				render( fig, JSON.parse( src.textContent ) );
			} catch ( e ) {
				if ( window.console ) {
					window.console.warn( 'ncsCharts: could not read a chart spec', e );
				}
			}
		} );
	}

	window.ncsCharts = { render: render, auto: auto, toPng: toPng, defaults: ( window.ncsCharts && window.ncsCharts.defaults ) || {} };
}() );
