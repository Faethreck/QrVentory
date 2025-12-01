package com.qrventory.mobile

data class ScannedItem(
    val serial: String = "",
    val name: String = "",
    val category: String = "",
    val location: String = "",
    val provider: String = "",
    val dateAdded: String = "",
    val raw: String = "",
    val extras: Map<String, String> = emptyMap(),
    val scannedAt: Long = System.currentTimeMillis()
)
