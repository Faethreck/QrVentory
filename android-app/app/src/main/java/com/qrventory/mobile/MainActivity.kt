package com.qrventory.mobile

import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.zxing.integration.android.IntentIntegrator
import com.qrventory.mobile.databinding.ActivityMainBinding
import org.json.JSONObject

class MainActivity : ComponentActivity() {

    private lateinit var binding: ActivityMainBinding
    private val adapter = ScannedItemAdapter()
    private val scannedHistory = mutableListOf<ScannedItem>()

    private val scanLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            val intentResult = IntentIntegrator.parseActivityResult(result.resultCode, result.data)
            if (intentResult != null) {
                if (intentResult.contents != null) {
                    handleScan(intentResult.contents)
                } else {
                    showToast("Escaneo cancelado")
                }
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.historyList.layoutManager = LinearLayoutManager(this)
        binding.historyList.adapter = adapter

        binding.scanButton.setOnClickListener { startScan() }
        binding.clearButton.setOnClickListener { clearHistory() }
    }

    private fun startScan() {
        val integrator = IntentIntegrator(this)
        integrator.setDesiredBarcodeFormats(IntentIntegrator.QR_CODE)
        integrator.setBeepEnabled(true)
        integrator.setOrientationLocked(false)
        integrator.setPrompt("Escanea un codigo QR de QrVentory")
        scanLauncher.launch(integrator.createScanIntent())
    }

    private fun clearHistory() {
        scannedHistory.clear()
        adapter.submitItems(scannedHistory)
        binding.statusText.text = "Historial limpio. Listo para escanear."
    }

    private fun handleScan(contents: String) {
        val parsed = parseItem(contents)
        scannedHistory.add(0, parsed)
        adapter.submitItems(scannedHistory)
        binding.statusText.text = "Ultimo: ${parsed.name.ifBlank { parsed.serial.ifBlank { "Item" } }}"
    }

    private fun parseItem(raw: String): ScannedItem {
        try {
            val json = JSONObject(raw)
            return ScannedItem(
                serial = json.optString("NoSerie"),
                name = json.optString("Nombre"),
                category = json.optString("Categoria"),
                location = json.optString("Ubicacion"),
                raw = raw
            )
        } catch (_: Exception) {
            // Not JSON? return raw.
        }
        return ScannedItem(raw = raw, serial = raw)
    }

    private fun showToast(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
    }
}
