"""Bonjour/mDNS advertisement so the iPhone can auto-discover the gesture receiver."""

import socket
from typing import Optional

from zeroconf import ServiceInfo, Zeroconf


class BonjourAdvertiser:
    """Advertise ``_hologesture._udp.`` via mDNS/Bonjour.

    The iPhone gesture sender browses for this service type to find the
    laptop's IP and port without manual configuration.
    """

    SERVICE_TYPE = "_hologesture._udp.local."

    def __init__(self, port: int = 9001, name: str = "HoloGesture Receiver") -> None:
        self._port = port
        self._name = name
        self._zeroconf: Optional[Zeroconf] = None
        self._info: Optional[ServiceInfo] = None

    def start(self) -> None:
        """Register the mDNS service."""
        local_ip = self._get_local_ip()

        self._info = ServiceInfo(
            type_=self.SERVICE_TYPE,
            name=f"{self._name}.{self.SERVICE_TYPE}",
            addresses=[socket.inet_aton(local_ip)],
            port=self._port,
            properties={"version": "1"},
        )

        self._zeroconf = Zeroconf()
        self._zeroconf.register_service(self._info)
        print(f"[bonjour] advertising {self.SERVICE_TYPE} on {local_ip}:{self._port}")

    def stop(self) -> None:
        """Unregister the mDNS service and clean up."""
        if self._zeroconf is not None and self._info is not None:
            self._zeroconf.unregister_service(self._info)
            self._zeroconf.close()
            self._zeroconf = None
            self._info = None
            print("[bonjour] service unregistered")

    # ── helpers ────────────────────────────────────────────────────────────

    @staticmethod
    def _get_local_ip() -> str:
        """Best-effort detection of the machine's LAN IP address."""
        try:
            # Connect to a public DNS address to determine the outgoing interface.
            # No data is actually sent.
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except OSError:
            return "127.0.0.1"
