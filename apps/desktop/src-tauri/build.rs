fn main() {
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&[
            "list_books",
            "import_book",
            "open_book",
            "save_book",
            "remove_book",
            "import_layers",
            "export_layers",
        ]),
    ))
    .expect("Unable to generate narrowly scoped application permissions");
}
