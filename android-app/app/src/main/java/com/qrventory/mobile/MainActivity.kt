package com.qrventory.mobile

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.core.view.isVisible
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.android.material.bottomsheet.BottomSheetDialog
import com.journeyapps.barcodescanner.ScanContract
import com.journeyapps.barcodescanner.ScanOptions
import com.qrventory.mobile.databinding.ActivityMainBinding
import com.qrventory.mobile.databinding.DialogItemDetailsBinding

class MainActivity : ComponentActivity() {

    private lateinit var binding: ActivityMainBinding
    private val adapter = ScannedItemAdapter(
        onItemClick = { showItemDetails(it) },
        onDeleteClick = { deleteItem(it) }
    )
    private val scannedHistory = mutableListOf<ScannedItem>()
    private var lastScanned: ScannedItem? = null

    private val scanLauncher = registerForActivityResult(ScanContract()) { result ->
        if (result.contents.isNullOrBlank()) {
            Toast.makeText(this, R.string.scan_cancelled, Toast.LENGTH_SHORT).show()
        } else {
            handleScan(result.contents)
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
        binding.showLastButton.setOnClickListener { lastScanned?.let { showItemDetails(it) } }
        binding.showLastButton.isEnabled = false
    }

    private fun startScan() {
        val options = ScanOptions().apply {
            setDesiredBarcodeFormats(ScanOptions.QR_CODE)
            setBeepEnabled(true)
            setOrientationLocked(false)
            setPrompt(getString(R.string.scan_prompt))
            captureActivity = InlineScanActivity::class.java
        }
        scanLauncher.launch(options)
    }

    private fun clearHistory() {
        scannedHistory.clear()
        adapter.submitItems(scannedHistory)
        binding.statusText.text = getString(R.string.history_cleared)
        lastScanned = null
        binding.showLastButton.isEnabled = false
    }

    private fun deleteItem(item: ScannedItem) {
        scannedHistory.remove(item)
        adapter.submitItems(scannedHistory)
        if (lastScanned == item) {
            lastScanned = scannedHistory.firstOrNull()
            binding.showLastButton.isEnabled = lastScanned != null
        }
    }

    private fun handleScan(contents: String) {
        val parsed = ItemParser.parse(contents)
        scannedHistory.add(0, parsed)
        adapter.submitItems(scannedHistory)
        val displayName = parsed.name.ifBlank { parsed.serial.ifBlank { getString(R.string.item_fallback) } }
        binding.statusText.text = getString(R.string.status_last, displayName)
        lastScanned = parsed
        binding.showLastButton.isEnabled = true
    }

    private fun showItemDetails(item: ScannedItem) {
        val dialog = BottomSheetDialog(this)
        val detailBinding = DialogItemDetailsBinding.inflate(layoutInflater)

        val serial = item.serial.ifBlank { getString(R.string.item_serial_placeholder) }
        val category = item.category.ifBlank { getString(R.string.item_category_placeholder) }
        val location = item.location.ifBlank { getString(R.string.item_location_placeholder) }
        val provider = item.provider.ifBlank { getString(R.string.extra_empty_value) }
        val dateAdded = item.dateAdded.ifBlank { getString(R.string.extra_empty_value) }

        detailBinding.nameValue.text = item.name.ifBlank { getString(R.string.item_name_placeholder) }
        detailBinding.serialValue.text = serial
        detailBinding.categoryValue.text = category
        detailBinding.locationValue.text = location
        detailBinding.providerValue.text = provider
        detailBinding.dateAddedValue.text = dateAdded
        detailBinding.rawValue.text = item.raw
        detailBinding.timestampValue.text = android.text.format.DateFormat.format("yyyy-MM-dd HH:mm", item.scannedAt)
        detailBinding.rawSection.isVisible = false
        detailBinding.toggleRawButton.text = getString(R.string.show_raw)

        detailBinding.extrasContainer.removeAllViews()
        if (item.extras.isEmpty()) {
            val empty = layoutInflater.inflate(R.layout.view_extra_row, detailBinding.extrasContainer, false)
            empty.findViewById<android.widget.TextView>(R.id.extraKey).text = getString(R.string.extra_none_label)
            empty.findViewById<android.widget.TextView>(R.id.extraValue).text = getString(R.string.extra_none_value)
            detailBinding.extrasContainer.addView(empty)
        } else {
            item.extras.forEach { (key, value) ->
                val row = layoutInflater.inflate(R.layout.view_extra_row, detailBinding.extrasContainer, false)
                row.findViewById<android.widget.TextView>(R.id.extraKey).text = key
                row.findViewById<android.widget.TextView>(R.id.extraValue).text = value.ifBlank { getString(R.string.extra_empty_value) }
                detailBinding.extrasContainer.addView(row)
            }
        }

        detailBinding.copyButton.setOnClickListener {
            val clipboard = getSystemService(CLIPBOARD_SERVICE) as ClipboardManager
            clipboard.setPrimaryClip(ClipData.newPlainText("QR data", item.raw))
            Toast.makeText(this, R.string.copy_confirm, Toast.LENGTH_SHORT).show()
        }
        detailBinding.shareButton.setOnClickListener {
            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                type = "text/plain"
                putExtra(Intent.EXTRA_TEXT, item.raw)
            }
            startActivity(Intent.createChooser(shareIntent, getString(R.string.share_title)))
        }

        detailBinding.toggleRawButton.setOnClickListener {
            detailBinding.rawSection.isVisible = !detailBinding.rawSection.isVisible
            detailBinding.toggleRawButton.text = getString(if (detailBinding.rawSection.isVisible) R.string.hide_raw else R.string.show_raw)
        }

        dialog.setContentView(detailBinding.root)
        dialog.show()
    }
}
