package com.goalterra.app;

import android.content.res.Configuration;
import android.graphics.drawable.ColorDrawable;
import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ThemeBgPlugin.class);
        // Draw behind the system bars; Capacitor's SystemBars plugin passes the insets to the web app.
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);
        // Until the web app reports its theme, use the app's own light or dark background (never the splash image).
        boolean night = (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
        int bg = night ? 0xFF1B1612 : 0xFFFAF5EE;
        getWindow().setBackgroundDrawable(new ColorDrawable(bg));
        getWindow().getDecorView().setBackgroundColor(bg);
    }
}
