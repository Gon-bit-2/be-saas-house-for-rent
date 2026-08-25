import { Body, Container, Head, Heading, Html, Img, Link, Section, Text } from '@react-email/components'
import * as React from 'react'

interface NewAccountEmailProps {
  fullName: string
  email: string
  plainPassword: string
  loginUrl: string
}

const baseUrl = `https://tse1.mm.bing.net/th/id/OIP.JHC3MTK4T6fKf_EbSkNNbAHaHa?rs=1&pid=ImgDetMain&o=7&rm=3`

export const NewAccountEmail = ({ fullName, email, plainPassword, loginUrl }: NewAccountEmailProps) => (
  <Html>
    <Head>Chào mừng bạn đến với hệ thống</Head>
    <Body style={main}>
      <Container style={container}>
        <Img src={`${baseUrl}`} width="212" height="88" alt="Company Logo" style={logo} />
        <Text style={tertiary}>Tài Khoản Nhân Viên Mới</Text>
        <Heading style={secondary}>Xin chào {fullName}!</Heading>
        <Text style={paragraph}>
          Tài khoản của bạn đã được tạo thành công trên hệ thống quản lý phòng trọ của chúng tôi. Dưới đây là thông tin đăng nhập của bạn:
        </Text>
        <Section style={infoContainer}>
          <Text style={infoText}>
            <strong>Email:</strong> {email}
          </Text>
          <Text style={infoText}>
            <strong>Mật khẩu:</strong> {plainPassword}
          </Text>
        </Section>
        <Text style={paragraph}>
          Vui lòng đăng nhập và đổi mật khẩu trong lần truy cập đầu tiên để bảo vệ tài khoản của bạn.
        </Text>
        <Section style={btnContainer}>
          <Link href={loginUrl} style={button}>
            Đăng nhập ngay
          </Link>
        </Section>
        <Text style={paragraph}>
          Nếu bạn gặp bất kỳ vấn đề nào, vui lòng liên hệ với quản lý của bạn.
        </Text>
      </Container>
      <Text style={footer}>Được bảo mật bởi hệ thống của chúng tôi.</Text>
    </Body>
  </Html>
)

NewAccountEmail.PreviewProps = {
  fullName: 'Nguyễn Văn A',
  email: 'nguyenvana@example.com',
  plainPassword: 'random_password_123',
  loginUrl: 'https://gonshoe.online/login',
} as NewAccountEmailProps

export default NewAccountEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: 'HelveticaNeue,Helvetica,Arial,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  border: '1px solid #eee',
  borderRadius: '5px',
  boxShadow: '0 5px 10px rgba(20,50,70,.2)',
  marginTop: '20px',
  maxWidth: '360px',
  margin: '0 auto',
  padding: '68px 0 130px',
}

const logo = {
  margin: '0 auto',
}

const tertiary = {
  color: '#0a85ea',
  fontSize: '11px',
  fontWeight: 700,
  fontFamily: 'HelveticaNeue,Helvetica,Arial,sans-serif',
  height: '16px',
  letterSpacing: '0',
  lineHeight: '16px',
  margin: '16px 8px 8px 8px',
  textTransform: 'uppercase' as const,
  textAlign: 'center' as const,
}

const secondary = {
  color: '#000',
  display: 'inline-block',
  fontFamily: 'HelveticaNeue-Medium,Helvetica,Arial,sans-serif',
  fontSize: '20px',
  fontWeight: 500,
  lineHeight: '24px',
  marginBottom: '0',
  marginTop: '0',
  textAlign: 'center' as const,
}

const infoContainer = {
  background: 'rgba(0,0,0,.05)',
  borderRadius: '4px',
  margin: '16px auto 14px',
  padding: '16px',
  width: '280px',
}

const infoText = {
  color: '#000',
  fontSize: '16px',
  fontFamily: 'HelveticaNeue,Helvetica,Arial,sans-serif',
  margin: '8px 0',
}

const paragraph = {
  color: '#444',
  fontSize: '15px',
  fontFamily: 'HelveticaNeue,Helvetica,Arial,sans-serif',
  letterSpacing: '0',
  lineHeight: '23px',
  padding: '0 40px',
  margin: '10px 0',
  textAlign: 'center' as const,
}

const btnContainer = {
  textAlign: 'center' as const,
  marginTop: '20px',
  marginBottom: '20px',
}

const button = {
  backgroundColor: '#0a85ea',
  borderRadius: '4px',
  color: '#fff',
  fontFamily: 'HelveticaNeue,Helvetica,Arial,sans-serif',
  fontSize: '15px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
}

const footer = {
  color: '#000',
  fontSize: '12px',
  fontWeight: 800,
  letterSpacing: '0',
  lineHeight: '23px',
  margin: '0',
  marginTop: '20px',
  fontFamily: 'HelveticaNeue,Helvetica,Arial,sans-serif',
  textAlign: 'center' as const,
  textTransform: 'uppercase' as const,
}
