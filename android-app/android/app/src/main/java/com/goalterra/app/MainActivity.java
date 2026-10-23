package com.goalterra.app;

import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Draw behind the system bars; Capacitor's SystemBars plugin passes the insets to the web app.
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);
    }
}
