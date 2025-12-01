package com.qrventory.mobile

import org.json.JSONObject

object ItemParser {
    fun parse(raw: String): ScannedItem {
        try {
            val json = JSONObject(raw)
            val knownKeys = setOf("NoSerie", "Nombre", "Categoria", "Ubicacion", "Proveedor", "Fecha", "FechaAlta", "FechaAgregado", "FechaIngreso")
            val extras = mutableMapOf<String, String>()
            json.keys().forEach { key ->
                if (key !in knownKeys) {
                    extras[key] = json.optString(key)
                }
            }
            return ScannedItem(
                serial = json.optString("NoSerie"),
                name = json.optString("Nombre"),
                category = json.optString("Categoria"),
                location = json.optString("Ubicacion"),
                provider = json.optString("Proveedor"),
                dateAdded = json.optString("Fecha").ifBlank {
                    json.optString("FechaAlta").ifBlank {
                        json.optString("FechaAgregado").ifBlank {
                            json.optString("FechaIngreso")
                        }
                    }
                },
                raw = raw,
                extras = extras
            )
        } catch (_: Exception) {
            // raw is not JSON; fall back to basic info.
        }
        return ScannedItem(raw = raw, serial = raw)
    }
}
