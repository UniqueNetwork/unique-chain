fn main() {
	#[cfg(feature = "std")]
	substrate_wasm_builder::WasmBuilder::new()
		.with_current_project()
		.import_memory()
		.export_heap_base()
		.build()
}
