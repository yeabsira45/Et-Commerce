import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      background: "linear-gradient(135deg,#f7f7f7,#e9ecef)",
      padding: "20px"
    }}>

      <div style={{
        background: "white",
        padding: "50px",
        borderRadius: "16px",
        boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
        textAlign: "center",
        maxWidth: "520px",
        width: "100%"
      }}>

        {/* Illustration */}
        <Image
          src="/errorpage.svg"
          alt="Lost page"
          width={220}
          height={220}
          style={{ marginBottom: "20px" }}
        />

        <h1 style={{
          fontSize: "90px",
          margin: "0",
          fontWeight: "900",
          letterSpacing: "-4px"
        }}>
          404
        </h1>

        <h2 style={{fontSize:"26px", marginTop:"10px"}}>
          Oops! Page got lost in Merkato.
        </h2>

        <p style={{
          color:"#666",
          marginTop:"10px",
          marginBottom:"25px",
          lineHeight:"1.6"
        }}>
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
          Maybe it went shopping in Addis and forgot to come back.
        </p>

        <p style={{
          fontStyle:"italic",
          color:"#888",
          marginBottom:"30px"
        }}>
          ይቅርታ! ይህ ገጽ አልተገኘም
        </p>

        <div style={{
          display:"flex",
          justifyContent:"center",
          gap:"15px",
          flexWrap:"wrap"
        }}>

          <Link href="/">
            <button style={{
              padding:"12px 26px",
              background:"#000",
              color:"#fff",
              border:"none",
              borderRadius:"8px",
              cursor:"pointer",
              fontWeight:"600"
            }}>
              Go Back Home
            </button>
          </Link>

          <Link href="/shop">
            <button style={{
              padding:"12px 26px",
              background:"#f5f5f5",
              border:"1px solid #ddd",
              borderRadius:"8px",
              cursor:"pointer",
              fontWeight:"600"
            }}>
              Browse Products
            </button>
          </Link>

        </div>

      </div>

    </div>
  );
}
