const _ = require("lodash")
const path = require("path")
const HtmlWebpackPlugin = require("html-webpack-plugin")
const Chunk = require("webpack/lib/Chunk")
const config = require("./config")
const Fontello = require("./Fontello")
const Css = require("./Css")

// https://github.com/jantimon/html-webpack-plugin/blob/master/index.js#L98
function getPublicPath(compilation) {
	let publicPath = compilation.getAssetPath(compilation.outputOptions.publicPath, { hash: compilation.hash }) || ""
	if(publicPath && publicPath.substr(-1) !== "/") {
		publicPath += "/"
	}
	return publicPath
}

class FontelloPlugin {
	constructor(options) {
		this.options = config(options)
		this.chunk = new Chunk(this.options.name)
		this.chunk.ids = []
		this.chunk.name = this.options.name
	}

	apply(compiler) {
		const { output } = this.options
		const chunk = this.chunk
		const fontello = new Fontello(this.options)
		compiler.hooks.make.tapAsync("FontelloPlugin", (compilation, cb) => {
			const cssFile = compilation.getPath(output.css, { chunk })
			const fontFile = ext => (
				compilation.getPath(output.font, { chunk })
				.replace(/\[ext\]/g, ext)
			)
			const cssRelativePath = ext => path.posix.relative(
				path.dirname(cssFile),
				fontFile(ext)
			)
			const addFile = (fileName, source) => {
				chunk.files.add(fileName)
				compilation.assets[fileName] = source
			}
			fontello.assets()
				.then(sources => {
					addFile(cssFile, new Css(this.options, cssRelativePath))
					for(const ext in sources) {
						addFile(fontFile(ext), sources[ext])
					}
				})
				.then(() => cb())
			HtmlWebpackPlugin.getHooks(compilation).beforeAssetTagGeneration.tapAsync("FontelloPlugin", (data, cb) => {
				console.log(getPublicPath(compilation))
				data.assets.css.push(getPublicPath(compilation) + cssFile)
				cb(null, data)
			})
			compilation.hooks.additionalAssets.tapAsync("FontelloPlugin", cb => {
				compilation.chunks.add(chunk)
				compilation.namedChunks[this.options.name] = chunk
				cb()
			})
		})
	}
}

FontelloPlugin.Css = Css

FontelloPlugin.Fontello = Fontello

module.exports = FontelloPlugin
